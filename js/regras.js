/**
 * IBREP Prism — Módulo: Regras do Atendimento
 * -----------------------------------------------------
 * Tudo que é específico da tela "Regras do Atendimento" (categorias
 * numeradas, lista de tópicos por categoria, mensagem padrão com botão
 * de copiar, e o CRUD de admin de categorias/tópicos) mora aqui.
 *
 * Carregado de forma "eager" (normal <script src>) no index.html, porque
 * `aplicarDadosSalvos()` já espera encontrar `REGRAS_DATA` pronto assim
 * que a página carrega (para atualizar a tag <script id="regras-data">
 * usada como cache). O HTML da tela (telas/regras.html) é que é
 * carregado sob demanda, só quando o usuário clica no botão.
 */

function openRegras() {
  if (!exigirPermissao("regras")) return;
  irParaTela("regras");
}

// { categorias: [ { id, numero, titulo, itens: [ { id, subtitulo, conteudo } ] } ] }
const REGRAS_DATA = { categorias: [] };

// Categoria atualmente selecionada no painel da esquerda (id da categoria).
// Também é usada/zerada em resetSelecoesTelas() no index.html.
let regrasCategoriaAtual = null;

// Atualiza a tag <script id="regras-data"> (cache local lido por outras
// telas/prints) e persiste + tenta sincronizar com o Supabase.
async function syncRegrasDataScript() {
  try {
    const el = document.getElementById("regras-data");
    if (el) el.textContent = JSON.stringify(REGRAS_DATA);
  } catch (e) { /* noop */ }
  const resultado = await resyncDataBlock("regras", REGRAS_DATA);
  avisarFalhaSalvarNuvem(resultado);
  return resultado;
}

// Converte o texto puro salvo no banco em parágrafos de HTML.
// Uma linha em branco separa parágrafos; quebras simples viram <br>.
function formatarConteudoRegra(texto) {
  const txt = String(texto || "");
  return txt
    .split(/\n\s*\n/)
    .map(par => escapeHtmlRegra(par).replace(/\n/g, "<br>"))
    .filter(p => p.trim() !== "")
    .map(p => `<p>${p}</p>`)
    .join("") || "<p></p>";
}

function initRegras() {
  regrasCategoriaAtual = (REGRAS_DATA.categorias[0] && REGRAS_DATA.categorias[0].id) || null;
  renderRegrasCats();
  renderRegrasList();
  const pane = document.getElementById("regras-detail-pane");
  if (pane) {
    pane.innerHTML = `
        <div class="regras-empty-state">
          <div class="icon">💬</div>
          <p>Selecione um tópico para ver a mensagem</p>
        </div>`;
  }
}

function renderRegrasCats() {
  const cont = document.getElementById("regras-cats-list");
  if (!cont) return;
  let html = "";
  REGRAS_DATA.categorias.forEach((cat, idx) => {
    const ativo = cat.id === regrasCategoriaAtual ? "active" : "";
    const qtd = (cat.itens || []).length;
    const delBtn = adminMode ? `<span class="regras-cat-del" data-del-regra-cat="${cat.id}" title="Excluir categoria">🗑️</span>` : "";
    html += `
          <button class="regras-cat-btn ${ativo}" data-regra-cat="${cat.id}">
            <span class="regras-cat-num" data-num="${cat.numero != null ? cat.numero : idx + 1}"></span>
            <span class="regras-cat-label">${escapeHtmlRegra(cat.titulo || "")}</span>
            <span class="regras-cat-count">${qtd}</span>
            ${delBtn}
          </button>`;
  });
  cont.innerHTML = html || `<div class="regras-empty-list">Nenhuma categoria cadastrada</div>`;
  cont.querySelectorAll("[data-regra-cat]").forEach(btn => {
    btn.addEventListener("click", e => {
      if (e.target.closest("[data-del-regra-cat]")) return;
      selectRegrasCategoria(btn.getAttribute("data-regra-cat"));
    });
  });
  cont.querySelectorAll("[data-del-regra-cat]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      excluirCategoriaRegra(el.getAttribute("data-del-regra-cat"));
    });
  });
}

function selectRegrasCategoria(catId) {
  regrasCategoriaAtual = catId;
  renderRegrasCats();
  renderRegrasList();
  const pane = document.getElementById("regras-detail-pane");
  if (pane) {
    pane.innerHTML = `
        <div class="regras-empty-state">
          <div class="icon">💬</div>
          <p>Selecione um tópico para ver a mensagem</p>
        </div>`;
  }
}

function regrasCategoriaAtualObj() {
  return REGRAS_DATA.categorias.find(c => c.id === regrasCategoriaAtual) || null;
}

function renderRegrasList() {
  const listEl = document.getElementById("regras-list-items");
  const titleEl = document.getElementById("regras-list-title");
  const countEl = document.getElementById("regras-list-count");
  if (!listEl) return;
  const busca = (document.getElementById("regras-search-input")?.value || "").trim().toLowerCase();
  const cat = regrasCategoriaAtualObj();

  if (titleEl) titleEl.textContent = cat ? (cat.titulo || "Tópicos") : "Tópicos";

  let itensParaMostrar = [];
  if (busca) {
    // Busca em todas as categorias, não só na atual.
    REGRAS_DATA.categorias.forEach(c => {
      (c.itens || []).forEach(item => {
        const alvo = `${item.subtitulo || ""} ${item.conteudo || ""}`.toLowerCase();
        if (alvo.includes(busca)) itensParaMostrar.push({ item, cat: c });
      });
    });
  } else if (cat) {
    itensParaMostrar = (cat.itens || []).map(item => ({ item, cat }));
  }

  if (countEl) countEl.textContent = `${itensParaMostrar.length} tópico${itensParaMostrar.length === 1 ? "" : "s"}`;

  let html = "";
  itensParaMostrar.forEach(({ item, cat: c }) => {
    const preview = String(item.conteudo || "").replace(/\s+/g, " ").trim();
    const delBtn = adminMode ? `<span class="regras-item-del" data-del-regra-item="${c.id}|${item.id}" title="Excluir tópico">🗑️</span>` : "";
    html += `
          <div class="regras-item" onclick="selectRegrasItem('${c.id}','${item.id}', this)">
            <div class="regras-item-icon">💬</div>
            <div class="regras-item-info">
              ${busca ? `<div class="regras-item-cat">${escapeHtmlRegra(c.titulo || "")}</div>` : ""}
              <div class="regras-item-title">${escapeHtmlRegra(item.subtitulo || "Sem título")}</div>
              <div class="regras-item-preview">${escapeHtmlRegra(preview)}</div>
            </div>
            ${delBtn}
          </div>`;
  });
  listEl.innerHTML = html || `<div class="regras-empty-list">Nenhum tópico encontrado</div>`;
  listEl.querySelectorAll("[data-del-regra-item]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      const [ catId, itemId ] = el.getAttribute("data-del-regra-item").split("|");
      excluirItemRegra(catId, itemId);
    });
  });
}

function selectRegrasItem(catId, itemId, el) {
  document.querySelectorAll("#regras-list-items .regras-item.active").forEach(x => x.classList.remove("active"));
  if (el) el.classList.add("active");

  const cat = REGRAS_DATA.categorias.find(c => c.id === catId);
  const item = cat && (cat.itens || []).find(i => String(i.id) === String(itemId));
  const pane = document.getElementById("regras-detail-pane");
  if (!pane) return;
  if (!item) {
    pane.innerHTML = `
        <div class="regras-empty-state">
          <div class="icon">💬</div>
          <p>Tópico não encontrado</p>
        </div>`;
    return;
  }

  pane.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">💬</div>
            <div style="flex:1;min-width:0;">
              <div class="regras-detail-breadcrumb">${escapeHtmlRegra(cat.titulo || "")}</div>
              <h2>${escapeHtmlRegra(item.subtitulo || "Sem título")}</h2>
            </div>
            <button class="regras-copy-btn" onclick="copiarConteudoRegra(this)">📋 Copiar mensagem</button>
          </div>
          <div class="regras-detail-content" id="regras-detail-content">${formatarConteudoRegra(item.conteudo)}</div>
        </div>`;

  if (adminMode) {
    const header = pane.querySelector(".regras-detail-header");
    if (header) {
      const editBtn = document.createElement("button");
      editBtn.className = "admin-edit-btn";
      editBtn.style.marginLeft = "8px";
      editBtn.textContent = "✏️ Editar";
      editBtn.onclick = () => abrirEdicaoRegra(catId, itemId);
      header.insertBefore(editBtn, header.querySelector(".regras-copy-btn"));
    }
  }
}

function copiarConteudoRegra(btn) {
  const contentEl = document.getElementById("regras-detail-content");
  if (!contentEl) return;
  const texto = contentEl.innerText || contentEl.textContent || "";
  navigator.clipboard.writeText(texto).then(() => {
    const textoOriginal = btn.textContent;
    btn.textContent = "✅ Copiado!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = textoOriginal;
      btn.classList.remove("copied");
    }, 1600);
  }).catch(() => {
    alert("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
  });
}

function abrirEdicaoRegra(catId, itemId) {
  const cat = REGRAS_DATA.categorias.find(c => c.id === catId);
  const item = cat && (cat.itens || []).find(i => String(i.id) === String(itemId));
  if (!item) return;
  const contentEl = document.getElementById("regras-detail-content");
  if (!contentEl) return;

  contentEl.setAttribute("contenteditable", "true");
  contentEl.classList.add("admin-editable");
  contentEl.focus();

  const header = document.querySelector("#regras-detail-pane .regras-detail-header");
  const editBtn = header ? header.querySelector(".admin-edit-btn") : null;
  if (editBtn) {
    editBtn.textContent = "💾 Salvar";
    editBtn.onclick = () => salvarEdicaoRegra(catId, itemId, contentEl, editBtn);
  }
}

async function salvarEdicaoRegra(catId, itemId, contentEl, editBtn) {
  const cat = REGRAS_DATA.categorias.find(c => c.id === catId);
  const item = cat && (cat.itens || []).find(i => String(i.id) === String(itemId));
  if (item) {
    // Guarda como texto puro (parágrafos separados por linha em branco),
    // já que é assim que carregarRegrasDasTabelas()/formatarConteudoRegra()
    // esperam o conteúdo.
    const paragrafos = Array.from(contentEl.querySelectorAll("p")).map(p => p.innerText.trim());
    item.conteudo = paragrafos.filter(p => p !== "").join("\n\n");
    await syncRegrasDataScript();
    renderRegrasList();
  }
  contentEl.removeAttribute("contenteditable");
  contentEl.classList.remove("admin-editable");
  mostrarFlashSalvo(editBtn ? editBtn.parentElement : null);
  if (editBtn) {
    editBtn.textContent = "✏️ Editar";
    editBtn.onclick = () => abrirEdicaoRegra(catId, itemId);
  }
}

// Volta o painel de detalhe (3ª coluna) para o estado vazio padrão —
// usado ao cancelar um formulário de "novo" ou depois de salvar.
function regrasResetPaneVazio() {
  const pane = document.getElementById("regras-detail-pane");
  if (pane) {
    pane.innerHTML = `
        <div class="regras-empty-state">
          <div class="icon">💬</div>
          <p>Selecione um tópico para ver a mensagem</p>
        </div>`;
  }
}

function proximoIdRegra() {
  let maior = 0;
  REGRAS_DATA.categorias.forEach(c => (c.itens || []).forEach(i => {
    const n = parseInt(i.id, 10);
    if (!isNaN(n) && n > maior) maior = n;
  }));
  return String(maior + 1);
}

// Em vez de um prompt(), abre um formulário direto no painel de
// detalhe (mesmo padrão usado em "Quem Procurar" para novo setor).
function adicionarCategoriaRegra() {
  const pane = document.getElementById("regras-detail-pane");
  if (!pane) return;
  pane.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">➕</div>
            <div><h2>Nova categoria</h2></div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Nome da categoria</label>
              <input type="text" id="admin-newregracat-nome" placeholder="Ex.: Financeiro">
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarNovaCategoriaRegra()">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="regrasResetPaneVazio()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
  setTimeout(() => document.getElementById("admin-newregracat-nome")?.focus(), 50);
}

function salvarNovaCategoriaRegra() {
  const nomeEl = document.getElementById("admin-newregracat-nome");
  const nomeLimpo = nomeEl ? nomeEl.value.trim() : "";
  if (!nomeLimpo) {
    alert("Digite um nome para a categoria.");
    return;
  }
  let base = nomeLimpo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "categoria";
  let id = base, n = 2;
  while (REGRAS_DATA.categorias.some(c => c.id === id)) {
    id = `${base}-${n++}`;
  }
  const numero = REGRAS_DATA.categorias.length + 1;
  REGRAS_DATA.categorias.push({ id, numero, titulo: nomeLimpo, itens: [] });
  regrasCategoriaAtual = id;
  renderRegrasCats();
  renderRegrasList();
  regrasResetPaneVazio();
  syncRegrasDataScript();
}

async function excluirCategoriaRegra(catId) {
  const cat = REGRAS_DATA.categorias.find(c => c.id === catId);
  if (!cat) return;
  if (!confirm(`Excluir a categoria "${cat.titulo}" e todos os seus tópicos? Essa ação não pode ser desfeita.`)) return;
  REGRAS_DATA.categorias = REGRAS_DATA.categorias.filter(c => c.id !== catId);
  if (regrasCategoriaAtual === catId) {
    regrasCategoriaAtual = (REGRAS_DATA.categorias[0] && REGRAS_DATA.categorias[0].id) || null;
  }
  renderRegrasCats();
  renderRegrasList();
  await syncRegrasDataScript();
}

// Em vez de dois prompt() em sequência, abre direto o quadro de edição
// (mesmo formato de "regras-detail-card" usado ao editar um tópico) já
// no painel de detalhe, com campos de título e mensagem.
function adicionarItemRegra() {
  const cat = regrasCategoriaAtualObj();
  if (!cat) {
    alert("Selecione uma categoria antes de adicionar um tópico.");
    return;
  }
  const pane = document.getElementById("regras-detail-pane");
  if (!pane) return;
  pane.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">➕</div>
            <div>
              <div class="regras-detail-breadcrumb">${escapeHtmlRegra(cat.titulo || "")}</div>
              <h2>Novo tópico</h2>
            </div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Título do tópico</label>
              <input type="text" id="admin-newregraitem-titulo" placeholder="Ex.: Cancelamento de matrícula">
              <label>Mensagem padrão</label>
              <textarea id="admin-newregraitem-conteudo" style="min-height:160px;" placeholder="Escreva aqui a mensagem padrão deste tópico..."></textarea>
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarNovoItemRegra('${cat.id}')">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="regrasResetPaneVazio()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
  setTimeout(() => document.getElementById("admin-newregraitem-titulo")?.focus(), 50);
}

function salvarNovoItemRegra(catId) {
  const cat = REGRAS_DATA.categorias.find(c => c.id === catId);
  if (!cat) return;
  const tituloEl = document.getElementById("admin-newregraitem-titulo");
  const subtituloLimpo = tituloEl ? tituloEl.value.trim() : "";
  if (!subtituloLimpo) {
    alert("Digite um título para o tópico.");
    return;
  }
  const conteudoEl = document.getElementById("admin-newregraitem-conteudo");
  const conteudo = conteudoEl ? conteudoEl.value.trim() : "";
  const novoItem = { id: proximoIdRegra(), subtitulo: subtituloLimpo, conteudo };
  cat.itens = cat.itens || [];
  cat.itens.push(novoItem);
  renderRegrasCats();
  renderRegrasList();
  regrasResetPaneVazio();
  syncRegrasDataScript();
}

async function excluirItemRegra(catId, itemId) {
  const cat = REGRAS_DATA.categorias.find(c => c.id === catId);
  if (!cat) return;
  const item = (cat.itens || []).find(i => String(i.id) === String(itemId));
  if (!item) return;
  if (!confirm(`Excluir o tópico "${item.subtitulo}"? Essa ação não pode ser desfeita.`)) return;
  cat.itens = (cat.itens || []).filter(i => String(i.id) !== String(itemId));
  renderRegrasCats();
  renderRegrasList();
  document.getElementById("regras-detail-pane").innerHTML = `
        <div class="regras-empty-state">
          <div class="icon">💬</div>
          <p>Selecione um tópico para ver a mensagem</p>
        </div>`;
  await syncRegrasDataScript();
}
