/* mapa-visual.js — tudo que é VISUAL do chat fica aqui (o TS só entrega conteúdo bruto).
 * JS puro, sem dependências.
 *
 *  1) Formata o texto da IA: limpa markdown, negrito automático, listas, separadores e TABELAS.
 *  2) Desenha MAPAS de qualquer assunto: horizontal, radial, vertical, fluxo, matriz, interativo.
 *
 * USO:
 *   MapaVisual.montar(elementoDaMensagem, data.resposta, data.mapas);
 *
 * CONFIG (opcional):
 *   MapaVisual.config({ termosNegrito: ["PRAZOS/Anne", "sem custo", "com custo"] });
 *   Termos sempre em negrito, mesmo que a IA esqueça.
 *
 * FORMATO DOS MAPAS (JSON que a IA devolve):
 *  árvore (horizontal | radial | vertical | interativo):
 *    { estilo, titulo, sub, legenda:{verde:"..."}, nos:[ {titulo, sub, cor, info:{campo:valor}, filhos:[...]} ] }
 *    (aceita também o formato antigo: blocos[] / cenarios[] / rotulo / texto / detalhe)
 *  fluxo (decisão ou passo a passo):
 *    { estilo:"fluxo", titulo, passo:{pergunta, sim:<passo|resultado>, nao:<passo|resultado>} }
 *    resultado = {texto, detalhe, cor, info, proximo:<passo|resultado>}   (proximo encadeia etapas)
 *  matriz:
 *    { estilo:"matriz", colunas:[{titulo,sub}], linhas:[{rotulo, celulas:[{texto,detalhe,cor}|null]}] }
 *  cores: verde | vermelho | cinza | azul | amarelo (sem cor = branco)
 */
(function (global) {
  "use strict";

  var CFG = { termosNegrito: ["PRAZOS/Anne", "sem custo", "com custo"] };
  var reTermos = null;
  function config(o) {
    if (o) for (var k in o) CFG[k] = o[k];
    reTermos = null;
  }

  /* ───────────────────────── CSS ───────────────────────── */
  var CSS = [
    ".mm{margin:12px 0;font:13px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;color:#2a2926;--mm-ln:#a9a699}",
    ".mm-corpo{overflow-x:auto;padding:8px 2px}",
    ".mm-corpo>*{min-width:max-content}",
    ".mm-no{box-sizing:border-box;min-width:110px;max-width:260px;padding:7px 12px;border:1px solid #d8d5cc;border-radius:10px;background:#fff;text-align:center}",
    ".mm-t{font-weight:600}",
    ".mm-s{font-size:11px;margin-top:2px;opacity:.85}",
    ".mm-verde{background:#e4f5ec;border-color:#8fd0b0;color:#14603f}",
    ".mm-vermelho{background:#fcebe5;border-color:#eaa797;color:#963820}",
    ".mm-cinza{background:#f1efe9;border-color:#cbc6b8;color:#5a5548}",
    ".mm-azul{background:#e5eefc;border-color:#9bbbea;color:#1d4f9a}",
    ".mm-amarelo{background:#fdf3d6;border-color:#e6cd7a;color:#7a5a08}",
    ".mm-raiz{background:#f1efe9;border-color:#bdb8a9;font-size:14px}",
    ".mm-compact{min-width:90px;max-width:150px;font-size:12px;padding:6px 8px}",
    ".mm-click{cursor:pointer;transition:box-shadow .15s}",
    ".mm-click:hover{box-shadow:0 1px 6px rgba(0,0,0,.18)}",
    ".mm-sel{box-shadow:0 0 0 2px #7a6a3a!important}",
    ".mm-vazio{border-style:dashed;background:transparent;color:#8a867a}",
    /* horizontal */
    ".mm-h-item{display:flex;align-items:center}",
    ".mm-h-node{position:relative;flex:none}",
    ".mm-h-node.tem{margin-right:40px}",
    ".mm-h-node.tem::after{content:'';position:absolute;left:100%;top:50%;width:20px;border-top:1.5px solid var(--mm-ln)}",
    ".mm-h-kid{position:relative;padding:4px 0}",
    ".mm-h-kid::before{content:'';position:absolute;left:-20px;top:50%;width:20px;border-top:1.5px solid var(--mm-ln)}",
    ".mm-h-kid::after{content:'';position:absolute;left:-20px;top:0;bottom:0;border-left:1.5px solid var(--mm-ln)}",
    ".mm-h-kid:first-child::after{top:50%}",
    ".mm-h-kid:last-child::after{bottom:50%}",
    ".mm-h-kid:only-child::after{display:none}",
    /* vertical */
    ".mm-v-item{display:flex;flex-direction:column;align-items:center;position:relative}",
    ".mm-v-kids{display:flex;justify-content:center;padding-top:22px;position:relative}",
    ".mm-v-kids::before{content:'';position:absolute;top:0;left:50%;height:22px;border-left:1.5px solid var(--mm-ln)}",
    ".mm-v-kid{position:relative;padding:22px 6px 0}",
    ".mm-v-kid::before,.mm-v-kid::after{content:'';position:absolute;top:0;width:50%;height:22px;border-top:1.5px solid var(--mm-ln)}",
    ".mm-v-kid::before{right:50%}",
    ".mm-v-kid::after{left:50%;border-left:1.5px solid var(--mm-ln)}",
    ".mm-v-kid:first-child::before,.mm-v-kid:last-child::after{border:0}",
    ".mm-v-kid:last-child::before{border-right:1.5px solid var(--mm-ln)}",
    ".mm-v-kid:only-child{padding-top:0}",
    ".mm-v-kid:only-child::before,.mm-v-kid:only-child::after{display:none}",
    /* radial */
    ".mm-r{position:relative;margin:0 auto}",
    ".mm-r-svg{position:absolute;left:0;top:0}",
    ".mm-r-ln{stroke:var(--mm-ln);stroke-width:1.5}",
    ".mm-abs{position:absolute;transform:translate(-50%,-50%)}",
    /* fluxo */
    ".mm-f{padding-left:4px}",
    ".mm-fc{display:flex;flex-direction:column;align-items:flex-start}",
    ".mm-f-row{display:flex;align-items:center}",
    ".mm-q{width:230px;max-width:230px}",
    ".mm-f-no{display:flex;flex-direction:column;align-items:center;width:84px}",
    ".mm-f-lb{font-size:11px;color:#6b675b;margin-bottom:1px}",
    ".mm-f-arrow{position:relative;width:100%;border-top:1.5px solid var(--mm-ln)}",
    ".mm-f-arrow::after{content:'';position:absolute;right:-1px;top:-5px;border:5px solid transparent;border-left:7px solid var(--mm-ln);border-right:0}",
    ".mm-f-down{position:relative;width:230px;height:38px}",
    ".mm-f-down::before{content:'';position:absolute;left:50%;top:0;bottom:6px;border-left:1.5px solid var(--mm-ln)}",
    ".mm-f-down::after{content:'';position:absolute;left:50%;bottom:0;transform:translateX(-50%);border:5px solid transparent;border-top:7px solid var(--mm-ln);border-bottom:0}",
    ".mm-f-down .mm-f-lb{position:absolute;left:calc(50% + 8px);top:50%;transform:translateY(-50%);margin:0}",
    /* matriz */
    ".mm-m{display:grid;gap:8px;align-items:stretch}",
    ".mm-m .mm-no{max-width:none;display:flex;flex-direction:column;justify-content:center}",
    ".mm-m-rot{display:flex;align-items:center;font-weight:600;padding-right:6px}",
    /* interativo + painel */
    ".mm-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}",
    ".mm-chip{font:inherit;padding:6px 12px;border:1px solid #cfcabc;border-radius:10px;background:#fff;color:inherit;cursor:pointer}",
    ".mm-chip:hover{background:#f6f4ee}",
    ".mm-chip.on{background:#2a2926;border-color:#2a2926;color:#fff}",
    ".mm-info{margin-top:10px;padding:10px 14px;border:1px solid #ddd8cb;border-radius:10px;background:#faf9f6}",
    ".mm-info-t{font-weight:600;margin-bottom:6px}",
    ".mm-info-g{display:grid;grid-template-columns:130px 1fr}",
    ".mm-info-k,.mm-info-v{padding:6px 0;border-bottom:1px solid #ece8dd}",
    ".mm-info-k{color:#6b675b;padding-right:10px}",
    ".mm-info-g>:nth-last-child(-n+2){border-bottom:0}",
    ".mm-info-dica{color:#6b675b}",
    /* legenda */
    ".mm-leg{display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;font-size:12px;color:#5a5548}",
    ".mm-leg i{display:inline-block;width:11px;height:11px;margin-right:6px;vertical-align:-1px;border-radius:3px;border:1px solid}",
    /* texto e tabelas */
    ".mm-gap{height:.6em}",
    ".mm-txt hr{border:0;border-top:1px solid #ddd8cb;margin:10px 0}",
    ".mm-tw{overflow-x:auto;margin:8px 0}",
    ".mm-tb{border-collapse:collapse;font-size:13px;min-width:100%}",
    ".mm-tb th,.mm-tb td{border:1px solid #ddd8cb;padding:6px 10px;text-align:left;vertical-align:top}",
    ".mm-tb th{background:#f1efe9;font-weight:600}"
  ].join("\n");

  var cssOk = false;
  function injetaCss() {
    if (cssOk) return;
    var s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    cssOk = true;
  }

  /* ───────────────────────── Texto → HTML ───────────────────────── */
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function reT() {
    if (reTermos === null) {
      var t = (CFG.termosNegrito || []).slice()
        .sort(function (a, b) { return b.length - a.length; })
        .map(function (x) { return esc(x).replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"); });
      reTermos = t.length ? new RegExp("(?<!\\w)(" + t.join("|") + ")(?!\\w)", "gi") : false;
    }
    return reTermos;
  }
  // só mexe nos pedaços que ainda NÃO estão em negrito
  function autoNegrito(h) {
    var re = reT();
    if (!re) return h;
    return h.split(/(<strong>.*?<\/strong>)/g).map(function (p, i) {
      return i % 2 ? p : p.replace(re, "<strong>$1</strong>");
    }).join("");
  }
  // uma linha ou célula: escapa HTML (só <br> passa), negrito, remove itálico/underline
  function inline(s) {
    s = s.replace(/<br\s*\/?>/gi, "\u0001");
    s = esc(s).replace(/\u0001/g, "<br>");
    s = s.replace(/__(.+?)__/g, "$1");
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(?<![\w*])\*(?![\s*])(.+?)(?<![\s*])\*(?![\w*])/g, "$1");
    s = s.replace(/\*\*/g, "");
    return autoNegrito(s);
  }
  function celulas(l) {
    return l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim(); });
  }
  function tabela(ls) {
    var rows = ls.map(celulas);
    var temSep = rows.length > 1 && rows[1].every(function (c) { return /^:?-{2,}:?$/.test(c); });
    var head = temSep ? rows[0] : null;
    var body = temSep ? rows.slice(2) : rows;
    var n = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    function td(tag, r) {
      var h = "";
      for (var i = 0; i < n; i++) {
        var c = r[i] == null ? "" : r[i];
        h += "<" + tag + ">" + inline(c.replace(/\s+·\s+/g, "<br>")) + "</" + tag + ">";
      }
      return "<tr>" + h + "</tr>";
    }
    return '<div class="mm-tw"><table class="mm-tb">' +
      (head ? "<thead>" + td("th", head) + "</thead>" : "") +
      "<tbody>" + body.map(function (r) { return td("td", r); }).join("") + "</tbody></table></div>";
  }
  // Texto bruto da IA → HTML
  function formatar(texto) {
    var t = String(texto || "")
      .replace(/^\s*[*_]*\s*fontes?\s*[*_]*\s*:.*$/gim, "")
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/`+/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    var ls = t.split("\n"), out = [], i = 0;
    while (i < ls.length) {
      var l = ls[i];
      if (/^\s*\|/.test(l)) {
        var tb = [];
        while (i < ls.length && /^\s*\|/.test(ls[i])) tb.push(ls[i++]);
        out.push(tabela(tb));
        continue;
      }
      i++;
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { out.push("<hr>"); continue; }
      if (!l.trim()) { out.push('<div class="mm-gap"></div>'); continue; }
      var ind = l.match(/^[ \t]*/)[0].length;
      l = l.trim().replace(/^#{1,6}\s*/, "").replace(/^[-*]\s+/, "• ");
      if (/^(📌|▸)/u.test(l) && l.indexOf("**") < 0) l = l.replace(/^((?:📌|▸)\s*)(.+)$/u, "$1**$2**");
      out.push('<div' + (ind >= 2 ? ' style="margin-left:' + Math.min(ind, 8) * 0.5 + 'em"' : "") + ">" + inline(l) + "</div>");
    }
    return out.join("");
  }

  /* ───────────────────────── Mapas: utilitários ───────────────────────── */
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }
  function corCls(c) {
    return ["verde", "vermelho", "cinza", "azul", "amarelo"].indexOf(c) >= 0 ? "mm-" + c : "";
  }
  // Normaliza um nó da árvore (aceita o formato antigo: rotulo/texto/detalhe/cenarios)
  function nn(n) {
    n = n || {};
    return {
      titulo: n.titulo != null ? n.titulo : (n.rotulo ? n.rotulo + " · " : "") + (n.texto || ""),
      sub: n.sub != null ? n.sub : n.detalhe,
      cor: n.cor,
      info: n.info,
      filhos: (n.filhos || n.cenarios || []).map(nn)
    };
  }
  function raizes(s) { return (s.nos || s.blocos || []).map(nn); }
  function raiz(s) { return { titulo: s.titulo, sub: s.sub, cor: s.cor, filhos: raizes(s) }; }

  // Balão: o = { titulo, sub, cor }
  function no(o, extra) {
    var n = el("div", "mm-no " + corCls(o.cor) + (extra ? " " + extra : ""));
    n.appendChild(el("div", "mm-t", o.titulo));
    if (o.sub) n.appendChild(el("div", "mm-s", o.sub));
    return n;
  }

  // Painel de detalhes
  function mostra(p, tit, info) {
    p.innerHTML = "";
    p.hidden = false;
    if (tit) p.appendChild(el("div", "mm-info-t", tit));
    if (!info || typeof info !== "object") {
      p.appendChild(el("div", "mm-info-dica", "Sem mais detalhes."));
      return;
    }
    var g = el("div", "mm-info-g");
    Object.keys(info).forEach(function (k) {
      g.appendChild(el("div", "mm-info-k", k));
      var v = el("div", "mm-info-v");
      String(info[k]).split("\n").forEach(function (l, i) {
        if (i) v.appendChild(document.createElement("br"));
        v.appendChild(document.createTextNode(l));
      });
      g.appendChild(v);
    });
    p.appendChild(g);
  }
  // Balão clicável quando o nó tem "info"
  function liga(n, nd, p) {
    if (!nd || !nd.info) return n;
    n.classList.add("mm-click");
    n.title = "Clique para ver os detalhes";
    n.onclick = function () {
      var r = n.closest(".mm");
      if (r) r.querySelectorAll(".mm-sel").forEach(function (x) { x.classList.remove("mm-sel"); });
      n.classList.add("mm-sel");
      mostra(p, nd.titulo, nd.info);
    };
    return n;
  }

  /* ───────────────────────── Estilos de mapa ───────────────────────── */
  // HORIZONTAL (árvore de qualquer profundidade)
  function hItem(node, kids) {
    var it = el("div", "mm-h-item");
    var tem = kids && kids.length;
    var w = el("div", "mm-h-node" + (tem ? " tem" : ""));
    w.appendChild(node);
    it.appendChild(w);
    if (tem) {
      var k = el("div", "mm-h-kids");
      kids.forEach(function (x) {
        var kd = el("div", "mm-h-kid");
        kd.appendChild(x);
        k.appendChild(kd);
      });
      it.appendChild(k);
    }
    return it;
  }
  function horizontal(s, p) {
    function rec(nd, d) {
      return hItem(liga(no(nd, d === 0 ? "mm-raiz" : ""), nd, p), nd.filhos.map(function (k) { return rec(k, d + 1); }));
    }
    return rec(raiz(s), 0);
  }

  // VERTICAL (organograma)
  function vItem(node, kids) {
    var it = el("div", "mm-v-item");
    it.appendChild(node);
    if (kids && kids.length) {
      var k = el("div", "mm-v-kids");
      kids.forEach(function (x) {
        var kd = el("div", "mm-v-kid");
        kd.appendChild(x);
        k.appendChild(kd);
      });
      it.appendChild(k);
    }
    return it;
  }
  function vertical(s, p) {
    function rec(nd, d) {
      var n = no(nd, d === 0 ? "mm-raiz" : d >= 2 ? "mm-compact" : "");
      if (d >= 2) n.title = nd.titulo;
      return vItem(liga(n, nd, p), nd.filhos.map(function (k) { return rec(k, d + 1); }));
    }
    return vItem(liga(no(raiz(s), "mm-raiz"), raiz(s), p), raizes(s).map(function (k) { return rec(k, 1); }));
  }

  // RADIAL (cada ramo ocupa uma fatia do círculo; os filhos se espalham dentro dela)
  function radial(s, p) {
    var NS = "http://www.w3.org/2000/svg";
    var R = raiz(s);
    function prof(n) { return n.filhos.length ? 1 + Math.max.apply(null, n.filhos.map(prof)) : 0; }
    var D = Math.min(prof(R), 3);
    var W = D >= 3 ? 1150 : 900, H = D >= 3 ? 760 : 620, cx = W / 2, cy = H / 2;
    var RX = [0, 175, 345, 500], RY = [0, 125, 245, 320];
    var box = el("div", "mm-r");
    box.style.width = W + "px";
    box.style.height = H + "px";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("class", "mm-r-svg");
    box.appendChild(svg);
    function linha(x1, y1, x2, y2) {
      var l = document.createElementNS(NS, "line");
      l.setAttribute("x1", x1); l.setAttribute("y1", y1);
      l.setAttribute("x2", x2); l.setAttribute("y2", y2);
      l.setAttribute("class", "mm-r-ln");
      svg.appendChild(l);
    }
    var nos = [];
    function pos(n, x, y) {
      n.style.left = x + "px";
      n.style.top = y + "px";
      n.classList.add("mm-abs");
      nos.push(n);
    }
    function place(nd, d, a0, a1, px, py) {
      var k = nd.filhos.length;
      nd.filhos.forEach(function (c, j) {
        var span = (a1 - a0) / k;
        var a = a0 + (j + 0.5) * span;
        var r = Math.min(d + 1, 3);
        var x = cx + RX[r] * Math.cos(a), y = cy + RY[r] * Math.sin(a);
        linha(px, py, x, y);
        pos(liga(no(c, d + 1 >= 2 ? "mm-compact" : ""), c, p), x, y);
        place(c, d + 1, a0 + j * span, a0 + (j + 1) * span, x, y);
      });
    }
    place(R, 0, -Math.PI / 2, (3 * Math.PI) / 2, cx, cy);
    pos(liga(no(R, "mm-raiz"), R, p), cx, cy);
    nos.forEach(function (n) { box.appendChild(n); }); // nós por cima das linhas
    return box;
  }

  // FLUXO (decisão e/ou passo a passo, recursivo)
  function seta(rotulo) {
    var d = el("div", "mm-f-down");
    if (rotulo) d.appendChild(el("span", "mm-f-lb", rotulo));
    return d;
  }
  function fluxoRaiz(s) {
    if (s.passo) return s.passo;
    if (s.passos) { // formato antigo: lista de perguntas encadeadas por "sim"
      var prox = s.final || null;
      for (var i = s.passos.length - 1; i >= 0; i--) {
        prox = { pergunta: s.passos[i].pergunta, nao: s.passos[i].nao, sim: prox };
      }
      return prox;
    }
    return null;
  }
  function fNo(nd, p, emColuna) {
    var col = el("div", "mm-fc");
    if (!nd) return col;
    if (nd.pergunta != null) {
      var row = el("div", "mm-f-row");
      row.appendChild(no({ titulo: nd.pergunta }, "mm-q"));
      if (nd.nao) {
        var a = el("div", "mm-f-no");
        a.appendChild(el("span", "mm-f-lb", "Não"));
        a.appendChild(el("span", "mm-f-arrow"));
        row.appendChild(a);
        row.appendChild(fNo(nd.nao, p, false));
      }
      col.appendChild(row);
      if (nd.sim) {
        col.appendChild(seta("Sim"));
        col.appendChild(fNo(nd.sim, p, true));
      }
    } else {
      var b = nn(nd);
      col.appendChild(liga(no(b, emColuna ? "mm-q" : ""), b, p));
      if (nd.proximo) {
        col.appendChild(seta());
        col.appendChild(fNo(nd.proximo, p, true));
      }
    }
    return col;
  }
  function fluxo(s, p) {
    var w = el("div", "mm-fc mm-f");
    if (s.titulo) {
      w.appendChild(no({ titulo: s.titulo, sub: s.sub }, "mm-raiz mm-q"));
      w.appendChild(seta());
    }
    w.appendChild(fNo(fluxoRaiz(s), p, true));
    return w;
  }

  // MATRIZ
  function matriz(s, p) {
    var cols = s.colunas || [];
    var g = el("div", "mm-m");
    g.style.gridTemplateColumns = "minmax(110px,max-content) repeat(" + Math.max(cols.length, 1) + ",minmax(130px,1fr))";
    g.appendChild(el("div"));
    cols.forEach(function (c) { g.appendChild(no({ titulo: c.titulo, sub: c.sub }, "mm-raiz")); });
    (s.linhas || []).forEach(function (l) {
      g.appendChild(el("div", "mm-m-rot", l.rotulo));
      cols.forEach(function (_c, i) {
        var c = (l.celulas || [])[i];
        if (c) {
          var nd = nn({ titulo: c.texto != null ? c.texto : c.titulo, sub: c.detalhe != null ? c.detalhe : c.sub, cor: c.cor, info: c.info });
          g.appendChild(liga(no(nd), nd, p));
        } else {
          var n = el("div", "mm-no mm-vazio");
          n.appendChild(el("div", "mm-t", "Não informado"));
          g.appendChild(n);
        }
      });
    });
    return g;
  }

  // INTERATIVO (uma fileira de botões por nível; o último mostra os detalhes)
  function interativo(s, p) {
    var w = el("div", "mm-i");
    var rows = el("div", "mm-rows");
    w.appendChild(rows);
    function chip(nd, rowEl, d) {
      var b = el("button", "mm-chip", nd.titulo + (nd.sub && d === 0 ? " · " + nd.sub : ""));
      b.type = "button";
      b.onclick = function () {
        rowEl.querySelectorAll(".mm-chip").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        while (rowEl.nextSibling) rows.removeChild(rowEl.nextSibling);
        if (nd.filhos.length) {
          nivel(nd.filhos, d + 1);
          if (nd.info) mostra(p, nd.titulo, nd.info);
          else {
            p.hidden = false;
            p.innerHTML = "";
            p.appendChild(el("div", "mm-info-dica", "Escolha uma opção."));
          }
        } else {
          mostra(p, nd.titulo, nd.info || (nd.sub ? { Detalhe: nd.sub } : null));
        }
      };
      return b;
    }
    function nivel(nodes, d) {
      var r = el("div", "mm-chips");
      nodes.forEach(function (n) { r.appendChild(chip(n, r, d)); });
      rows.appendChild(r);
      return r;
    }
    var r0 = nivel(raizes(s), 0);
    if (r0.firstChild) r0.firstChild.click();
    return w;
  }

  var ESTILOS = { horizontal: horizontal, radial: radial, vertical: vertical, fluxo: fluxo, matriz: matriz, interativo: interativo };

  /* ───────────────────────── API ───────────────────────── */
  function render(spec) {
    injetaCss();
    var s = spec || {};
    var r = el("div", "mm");
    var p = el("div", "mm-info");
    p.hidden = true;
    var corpo = el("div", "mm-corpo");
    try {
      corpo.appendChild((ESTILOS[s.estilo] || horizontal)(s, p));
    } catch (e) {
      console.error("MapaVisual:", e);
      corpo.appendChild(el("div", "mm-info-dica", "⚠️ Não consegui desenhar este mapa."));
    }
    r.appendChild(corpo);
    if (s.legenda && typeof s.legenda === "object") {
      var leg = el("div", "mm-leg");
      Object.keys(s.legenda).forEach(function (k) {
        var it = el("span");
        it.appendChild(el("i", corCls(k)));
        it.appendChild(document.createTextNode(s.legenda[k]));
        leg.appendChild(it);
      });
      r.appendChild(leg);
    }
    r.appendChild(p);
    return r;
  }

  // Monta a resposta inteira: texto formatado + mapas nos lugares dos marcadores [[MAPA:n]]
  // renderTexto (opcional): troca o formatador de texto padrão pelo seu.
  function montar(container, texto, mapas, renderTexto) {
    injetaCss();
    container.innerHTML = "";
    String(texto || "").split(/\[\[MAPA:(\d+)\]\]/).forEach(function (pt, i) {
      if (i % 2 === 0) {
        if (!pt.trim()) return;
        var d = el("div", "mm-txt");
        d.innerHTML = (renderTexto || formatar)(pt);
        container.appendChild(d);
      } else {
        var spec = (mapas || [])[Number(pt)];
        if (spec) container.appendChild(render(spec));
      }
    });
  }

  global.MapaVisual = { render: render, montar: montar, formatar: formatar, config: config };
})(window);
