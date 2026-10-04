let IA_HISTORICO = [];
let IA_CONVERSA_ID = null;
let IA_CONVERSAS = [];



// ───────── Cache local: permite reabrir a conversa na hora ao recarregar ─────────

const IA_CACHE_CONVERSA = "ia_cache_conversa";
const IA_CACHE_LISTA = "ia_cache_lista";

function iaUsuarioId() {
  return (typeof currentUser !== "undefined" && currentUser && currentUser.id != null) ? String(currentUser.id) : "";
}

function iaCacheLer(chave) {
  try { return JSON.parse(localStorage.getItem(chave) || "null"); } catch { return null; }
}

function iaCacheGravar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch {}
}

function iaSalvarCache() {
  iaCacheGravar(IA_CACHE_CONVERSA, {
    u: iaUsuarioId(),
    id: IA_CONVERSA_ID,
    titulo: document.getElementById("ia-titulo-conversa")?.textContent || "Nova conversa",
    msgs: IA_HISTORICO
  });
}

function iaLimparCache() {
  try { localStorage.removeItem(IA_CACHE_CONVERSA); } catch {}
}

// Desenha a conversa guardada, de forma SÍNCRONA (sem esperar a rede).
function iaRestaurarDoCache() {
  const c = iaCacheLer(IA_CACHE_CONVERSA);
  if (!c || !Array.isArray(c.msgs) || !c.msgs.length) return false;
  const uAtual = iaUsuarioId();
  if (uAtual && c.u && uAtual !== c.u) return false; // cache de outro usuário

  IA_CONVERSA_ID = c.id ?? null;
  IA_HISTORICO = c.msgs;
  const box = document.getElementById("ia-mensagens");
  if (!box) return false;
  box.innerHTML = "";
  IA_HISTORICO.forEach(m => {
    if (m.role === "user") iaAddMsg("user", m.content);
    else iaAddMsgBot(m.content);
  });
  iaDefinirTitulo(c.titulo);
  return true;
}

function openIA() {
  if (!exigirPermissao("ia")) return;
  irParaTela("ia");
}

// Espera o usuário logado estar disponível (ao recarregar, ele pode demorar alguns instantes)
function iaAguardarUsuario(ms = 8000) {
  return new Promise(resolve => {
    const t0 = Date.now();
    (function checar() {
      if (typeof currentUser !== "undefined" && currentUser && currentUser.id != null) return resolve(true);
      if (Date.now() - t0 > ms) return resolve(false);
      setTimeout(checar, 100);
    })();
  });
}

async function initIAScreen() {
  const box = document.getElementById("ia-mensagens");

  // 1) NA HORA: se há conversa guardada, desenha ela (e a lista do histórico) sem esperar a rede
  let restaurou = false;
  if (!IA_CONVERSA_ID && !IA_HISTORICO.length) {
    restaurou = iaRestaurarDoCache();
    const lc = iaCacheLer(IA_CACHE_LISTA);
    if (lc && Array.isArray(lc.lista) && (!iaUsuarioId() || lc.u === iaUsuarioId())) {
      IA_CONVERSAS = lc.lista;
      iaRenderLista();
    }
  }
  // Só mostra a saudação se realmente não há conversa para mostrar
  if (!restaurou && box && !box.children.length) iaAddMsg("bot", IA_SAUDACAO);

  // 2) EM SEGUNDO PLANO: confirma usuário e atualiza o histórico com o servidor
  if (!(await iaAguardarUsuario())) return;

  // cache era de outro usuário? então volta para uma conversa nova
  const c = iaCacheLer(IA_CACHE_CONVERSA);
  if (restaurou && c && c.u && c.u !== iaUsuarioId()) {
    iaNovaConversa();
  }

  const listou = await iaCarregarLista();

  // a conversa aberta foi excluída em outro lugar? então limpa
  if (listou && IA_CONVERSA_ID && !IA_CONVERSAS.some(x => String(x.id) === String(IA_CONVERSA_ID))) {
    iaNovaConversa();
  }
}

function iaAddMsg(tipo, texto, html) {
  const box = document.getElementById("ia-mensagens");
  const div = document.createElement("div");
  div.className = "ia-msg " + tipo;
  if (html) div.innerHTML = texto;
  else div.textContent = texto;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

function iaFormatar(texto) {
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = s => esc(s)
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const celulas = l => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
  const ehTab = l => /^\s*\|.*\|\s*$/.test(l);
  const ehSep = l => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);

  const linhas = String(texto || "").split("\n");
  let html = "";
  let par = [];
  let i = 0;

  const fechaParagrafo = () => {
    if (!par.length) return;
    // Parágrafo que é só uma linha em negrito = título de bloco
    const titulo = par.length === 1 && /^<strong>[^<]*<\/strong>$/.test(par[0]);
    html += '<div class="ia-p' + (titulo ? " ia-titulo" : "") + '">' + par.join("<br>") + "</div>";
    par = [];
  };

  while (i < linhas.length) {
    const l = linhas[i];

    // Tabela: linha de cabeçalho + linha separadora (|---|---|)
    if (ehTab(l) && i + 1 < linhas.length && ehSep(linhas[i + 1])) {
      fechaParagrafo();
      const cab = celulas(l);
      i += 2;
      const corpo = [];
      while (i < linhas.length && ehTab(linhas[i]) && !ehSep(linhas[i])) {
        corpo.push(celulas(linhas[i]));
        i++;
      }
      html += '<div class="ia-tab-wrap"><table class="ia-tab"><thead><tr>' +
        cab.map(h => "<th>" + inline(h) + "</th>").join("") +
        "</tr></thead><tbody>" +
        corpo.map(r => {
          const total = /^total/i.test((r[0] || "").replace(/\*/g, "").trim());
          return "<tr" + (total ? ' class="ia-total"' : "") + ">" +
            r.map(c => "<td>" + inline(c) + "</td>").join("") + "</tr>";
        }).join("") +
        "</tbody></table></div>";
      continue;
    }

    if (/^\s*-{3,}\s*$/.test(l)) {
      fechaParagrafo();
      html += '<hr class="ia-hr">';
    } else if (!l.trim()) {
      fechaParagrafo();
    } else {
      par.push(inline(l.replace(/^#{1,6}\s*(.+)$/, "**$1**")));
    }
    i++;
  }
  fechaParagrafo();
  return html;
}

// Troca [[MAPA:n]] pelo JSON do mapa, para ele ficar guardado junto com o texto da conversa
function iaComMapas(resposta, mapas) {
  return String(resposta || "").replace(/\[\[MAPA:(\d+)\]\]/g, (_, n) => {
    const m = (mapas || [])[Number(n)];
    return m ? "[[MAPA]]" + JSON.stringify(m) + "[[/MAPA]]" : "";
  });
}

// Desenha texto + tabelas + mapas dentro de um balão
function iaRenderResposta(el, content) {
  const mapas = [];
  const texto = String(content || "").replace(/\[\[MAPA\]\]([\s\S]*?)\[\[\/MAPA\]\]/g, (_, j) => {
    try {
      mapas.push(JSON.parse(j));
      return "\n\n[[MAPA:" + (mapas.length - 1) + "]]\n\n";
    } catch (e) {
      console.warn("Kym: JSON do mapa inválido.", e, j);
      return "\n\n⚠️ Não consegui montar o mapa visual. Peça novamente.\n\n";
    }
  });
  console.log("Kym: mapas nesta resposta =", mapas.length, "| MapaVisual carregado =", typeof MapaVisual !== "undefined");
  if (typeof MapaVisual !== "undefined") {
    MapaVisual.montar(el, texto, mapas);
  } else {
    // mapa-visual.js não carregou: antes o mapa sumia em silêncio, agora avisa
    console.error("Kym: mapa-visual.js não foi carregado (confira o nome/caminho do arquivo no servidor).");
    const aviso = mapas.length
      ? "\n\n⚠️ O mapa não pôde ser desenhado: o arquivo mapa-visual.js não foi carregado.\n\n"
      : "";
    el.innerHTML = iaFormatar(texto.replace(/\[\[MAPA:\d+\]\]/g, aviso));
  }
}

// Mensagem da Kym (usada ao reabrir conversas)
function iaAddMsgBot(content) {
  const div = iaAddMsg("bot", "");
  iaRenderResposta(div, content);
  const box = document.getElementById("ia-mensagens");
  if (box) box.scrollTop = box.scrollHeight;
  return div;
}

function iaDefinirTitulo(titulo) {
  const el = document.getElementById("ia-titulo-conversa");
  if (el) el.textContent = titulo || "Nova conversa";
}

// ───────── Histórico (lateral esquerda) ─────────

async function iaCarregarLista() {
  if (!currentUser) return false;
  let ok = true;
  try {
    IA_CONVERSAS = await supabaseRpc("ia_listar_conversas", {
      p_usuario_id: String(currentUser.id)
    });
    if (!Array.isArray(IA_CONVERSAS)) IA_CONVERSAS = [];
    iaCacheGravar(IA_CACHE_LISTA, { u: iaUsuarioId(), lista: IA_CONVERSAS });
  } catch (e) {
    console.warn("Kym: não foi possível carregar o histórico.", e);
    IA_CONVERSAS = [];
    ok = false;
  }
  iaRenderLista();
  return ok;
}

function iaRenderLista() {
  const lista = document.getElementById("ia-hist-lista");
  if (!lista) return;
  lista.innerHTML = "";
  if (!IA_CONVERSAS.length) {
    const vazio = document.createElement("div");
    vazio.className = "ia-hist-vazio";
    vazio.textContent = "Suas conversas aparecerão aqui.";
    lista.appendChild(vazio);
    return;
  }
  IA_CONVERSAS.forEach(c => {
    const item = document.createElement("div");
    item.className = "ia-hist-item" + (c.id === IA_CONVERSA_ID ? " active" : "");
    item.title = c.titulo;
    item.onclick = () => iaAbrirConversa(c.id);

    const nome = document.createElement("span");
    nome.className = "ia-hist-nome";
    nome.textContent = c.titulo;

    const del = document.createElement("button");
    del.className = "ia-hist-del";
    del.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
    del.title = "Excluir conversa";
    del.onclick = ev => {
      ev.stopPropagation();
      iaExcluirConversa(c.id);
    };

    item.appendChild(nome);
    item.appendChild(del);
    lista.appendChild(item);
  });
}

function iaNovaConversa() {
  IA_CONVERSA_ID = null;
  IA_HISTORICO = [];
  iaLimparCache();
  const box = document.getElementById("ia-mensagens");
  if (box) box.innerHTML = "";
  iaAddMsg("bot", IA_SAUDACAO);
  iaDefinirTitulo("Nova conversa");
  iaRenderLista();
  document.getElementById("ia-input")?.focus();
}

async function iaAbrirConversa(id) {
  try {
    const msgs = await supabaseRpc("ia_carregar_conversa", {
      p_usuario_id: String(currentUser.id),
      p_id: id
    });
    IA_CONVERSA_ID = id;
    IA_HISTORICO = Array.isArray(msgs) ? msgs : [];
    const box = document.getElementById("ia-mensagens");
    box.innerHTML = "";
    IA_HISTORICO.forEach(m => {
      if (m.role === "user") iaAddMsg("user", m.content);
      else iaAddMsgBot(m.content);
    });
    const c = IA_CONVERSAS.find(x => x.id === id);
    iaDefinirTitulo(c ? c.titulo : "Conversa");
    iaSalvarCache();
    iaRenderLista();
  } catch (e) {
    alert("Não foi possível abrir essa conversa.");
  }
}

async function iaExcluirConversa(id) {
  if (!confirm("Excluir esta conversa do histórico?")) return;
  try {
    await supabaseRpc("ia_excluir_conversa", {
      p_usuario_id: String(currentUser.id),
      p_id: id
    });
    if (id === IA_CONVERSA_ID) iaNovaConversa();
    await iaCarregarLista();
  } catch (e) {
    alert("Não foi possível excluir a conversa.");
  }
}

async function iaSalvarConversa() {
  try {
    const primeira = IA_HISTORICO.find(m => m.role === "user");
    const titulo = primeira ? primeira.content.slice(0, 60) : "Nova conversa";
    const id = await supabaseRpc("ia_salvar_conversa", {
      p_usuario_id: String(currentUser.id),
      p_id: IA_CONVERSA_ID,
      p_titulo: titulo,
      p_mensagens: IA_HISTORICO
    });
    if (id) {
      IA_CONVERSA_ID = id;
      }
    if (IA_HISTORICO.length === 2) iaDefinirTitulo(titulo);
    await iaCarregarLista();
  } catch (e) {
    console.warn("Kym: não foi possível salvar a conversa.", e);
  }
}

// ───────── Envio ─────────

async function enviarIA() {
  const input = document.getElementById("ia-input");
  const btn = document.getElementById("ia-enviar");
  const pergunta = input.value.trim();
  if (!pergunta) return;

  input.value = "";
  iaAddMsg("user", pergunta);
  IA_HISTORICO.push({ role: "user", content: pergunta });
  const aguarde = iaAddMsg("bot", "Pensando…");
  btn.disabled = true;

  let ok = false;
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/chat-ia`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ mensagens: IA_HISTORICO, userId: currentUser.id })
    });
        const data = await resp.json();
    const texto = data.resposta
      ? iaComMapas(data.resposta, data.mapas)
      : (data.erro || "Não consegui responder.");
    if (data.resposta) iaRenderResposta(aguarde, texto);
    else aguarde.textContent = texto;
    if (data.resposta) {
      IA_HISTORICO.push({ role: "assistant", content: texto });
      iaSalvarCache();
      ok = true;
    } else {
      IA_HISTORICO.pop();
    }
  } catch (e) {
    aguarde.textContent = "Erro de conexão. Tente novamente.";
    IA_HISTORICO.pop();
  } finally {
    btn.disabled = false;
    input.focus();
    const box = document.getElementById("ia-mensagens");
    if (box) box.scrollTop = box.scrollHeight;
  }
  if (ok) await iaSalvarConversa();
}
