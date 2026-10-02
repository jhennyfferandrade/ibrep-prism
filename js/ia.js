let IA_HISTORICO = [];
let IA_CONVERSA_ID = null;
let IA_CONVERSAS = [];

const IA_SAUDACAO = "Olá! Eu sou a Íris. Pergunte o que precisar sobre regras, portarias, contatos, instituições e cursos do IBREP.";

function openIA() {
  if (!exigirPermissao("ia")) return;
  irParaTela("ia");
}

function initIAScreen() {
  const box = document.getElementById("ia-mensagens");
  if (box && !box.children.length) iaAddMsg("bot", IA_SAUDACAO);
  iaCarregarLista();
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
    if (par.length) { html += '<div class="ia-p">' + par.join("<br>") + "</div>"; par = []; }
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

function iaDefinirTitulo(titulo) {
  const el = document.getElementById("ia-titulo-conversa");
  if (el) el.textContent = titulo || "Nova conversa";
}

// ───────── Histórico (lateral esquerda) ─────────

async function iaCarregarLista() {
  if (!currentUser) return;
  try {
    IA_CONVERSAS = await supabaseRpc("ia_listar_conversas", {
      p_usuario_id: String(currentUser.id)
    });
  } catch (e) {
    console.warn("Íris: não foi possível carregar o histórico.", e);
    IA_CONVERSAS = [];
  }
  iaRenderLista();
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
      else iaAddMsg("bot", iaFormatar(m.content), true);
    });
    const c = IA_CONVERSAS.find(x => x.id === id);
    iaDefinirTitulo(c ? c.titulo : "Conversa");
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
    if (id) IA_CONVERSA_ID = id;
    if (IA_HISTORICO.length === 2) iaDefinirTitulo(titulo);
    await iaCarregarLista();
  } catch (e) {
    console.warn("Íris: não foi possível salvar a conversa.", e);
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
    const texto = data.resposta || data.erro || "Não consegui responder.";
    aguarde.innerHTML = iaFormatar(texto);
    if (data.resposta) {
      IA_HISTORICO.push({ role: "assistant", content: texto });
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
