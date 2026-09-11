/**
 * IBREP Prism — Módulo: Tutoriais
 * ---------------------------------
 * Tudo que é específico da tela "Tutoriais" (categorias, vídeos, busca)
 * mora aqui.
 *
 * Assim como o calendário, este arquivo é carregado de forma "eager"
 * (normal <script src>) no index.html, ANTES do script principal,
 * porque `aplicarDadosSalvos()` já espera encontrar `TUTORIAIS` pronto
 * para preencher com os dados da nuvem/localStorage assim que a página
 * carrega. O HTML da tela (telas/tutoriais.html) é que é carregado sob
 * demanda, só quando o usuário clica no botão.
 */

const TUTORIAIS = {};

let tutCategoriaAtual = null;

function openTutorials() {
  if (!exigirPermissao("tutoriais")) return;
  irParaTela("tutorials");
}

function initTutorialsScreen() {
  renderTutCats();
  const chave = tutCategoriaAtual && TUTORIAIS[tutCategoriaAtual] ? tutCategoriaAtual : Object.keys(TUTORIAIS)[0];
  const btn = document.querySelector(`.tut-cat-btn[data-cat="${chave}"]`);
  if (btn) setTutCat(btn, chave);
}

function renderTutCats() {
  const cont = document.getElementById("tut-cats-list");
  if (!cont) return;
  let html = "";
  Object.keys(TUTORIAIS).forEach((key, idx) => {
    const cat = TUTORIAIS[key];
    const ativo = key === tutCategoriaAtual ? "active" : "";
    const delBtn = adminMode ? `<span class="tut-cat-del" data-del-cat="${key}" title="Excluir categoria">🗑️</span>` : "";
    html += `\n          <button class="tut-cat-btn ${ativo}" data-cat="${key}">\n            <span class="tut-cat-icon" data-num="${idx + 1}"></span> ${escapeHtmlRegra(cat.label || cat.titulo || key)}${delBtn}\n          </button>`;
  });
  cont.innerHTML = html;
  cont.querySelectorAll(".tut-cat-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      if (e.target.closest("[data-del-cat]")) return;
      setTutCat(btn, btn.getAttribute("data-cat"));
    });
  });
  cont.querySelectorAll("[data-del-cat]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      excluirTutCategoria(el.getAttribute("data-del-cat"));
    });
  });
}

function excluirTutCategoria(cat) {
  const data = TUTORIAIS[cat];
  if (!data) return;
  if (!confirm(`Excluir a categoria "${data.label || data.titulo || cat}" e todos os vídeos dela? Essa ação não pode ser desfeita.`)) return;
  delete TUTORIAIS[cat];
  resyncDataBlock("tutoriais", TUTORIAIS);
  const chaves = Object.keys(TUTORIAIS);
  renderTutCats();
  if (chaves.length) {
    const proxima = chaves[0];
    const btn = document.querySelector(`.tut-cat-btn[data-cat="${proxima}"]`);
    setTutCat(btn, proxima);
  } else {
    tutCategoriaAtual = null;
    document.getElementById("tut-content").innerHTML = `<div class="tut-empty">📂 Nenhuma categoria cadastrada ainda</div>`;
  }
}

// Pausa qualquer outro vídeo de tutorial quando um novo começa a tocar (API do Panda Video)
// Pausa qualquer outro vídeo de tutorial quando um novo começa a tocar (API do Panda Video)
window.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.message === "panda_play") {
    document.querySelectorAll(".tut-video-thumb iframe").forEach(f => {
      if (f.contentWindow && f.contentWindow !== event.source) {
        f.contentWindow.postMessage({ type: "pause" }, "*");
      }
    });
  }
});

function filterTutorials(q) {
  q = q.trim().toLowerCase();
  if (!q) {
    const activeBtn = document.querySelector(".tut-cat-btn.active");
    if (activeBtn) activeBtn.click();
    return;
  }
  const area = document.getElementById("tut-content");
  let resultados = [];
  Object.values(TUTORIAIS).forEach(cat => {
    cat.videos.forEach(v => {
      if (v.titulo.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q) || v.tag.toLowerCase().includes(q) || cat.titulo.toLowerCase().includes(q)) {
        resultados.push({
          ...v,
          catTitulo: cat.titulo
        });
      }
    });
  });
  if (resultados.length === 0) {
    area.innerHTML = `<div class="tut-empty">🔍 Nenhum tutorial encontrado para "<strong>${q}</strong>"</div>`;
    return;
  }
  let html = `\n    <div class="tut-content-title">🔍 Resultados para "${q}"</div>\n    <div class="tut-content-desc">${resultados.length} tutorial(is) encontrado(s)</div>\n    <div class="tut-video-grid">`;
  resultados.forEach(v => {
    if (v.url) {
      html += `<div class="tut-video-card">\n        <div class="tut-video-thumb">\n          <iframe src="${v.url}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n        </div>\n        <div class="tut-video-info">\n          <span class="tut-video-tag">${v.tag}</span>\n          <div class="tut-video-title">${v.titulo}</div>\n          <div class="tut-video-desc">${v.desc}</div>\n        </div>\n      </div>`;
    } else {
      html += `<div class="tut-video-card">\n        <div class="tut-video-thumb" style="cursor:default">\n          <div class="play-overlay" style="flex-direction:column;gap:8px;font-size:14px;color:var(--roxo);font-weight:500">\n            <span style="font-size:36px">🎬</span>Em breve\n          </div>\n        </div>\n        <div class="tut-video-info">\n          <span class="tut-video-tag">${v.tag}</span>\n          <div class="tut-video-title">${v.titulo}</div>\n          <div class="tut-video-desc">${v.desc}</div>\n        </div>\n      </div>`;
    }
  });
  html += `</div>`;
  area.innerHTML = html;
}

function setTutCat(btn, cat) {
  document.querySelectorAll(".tut-cat-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  tutCategoriaAtual = cat;
  const data = TUTORIAIS[cat];
  const area = document.getElementById("tut-content");
  if (!data) {
    area.innerHTML = `<div class="tut-empty">📂 Categoria não encontrada</div>`;
    return;
  }
  const editCatBtn = adminMode ? `<button class="admin-edit-btn" style="margin-left:8px;" onclick="abrirEdicaoTutCategoria('${cat}')">✏️ Editar</button>\n           <button class="admin-edit-btn" style="margin-left:6px;" onclick="abrirNovoTutVideo('${cat}')">➕ Novo vídeo</button>` : "";
  let html = `\n    <div style="display:flex;align-items:center;">\n      <div class="tut-content-title">${data.titulo}</div>${editCatBtn}\n    </div>\n    <div class="tut-content-desc">${data.desc}</div>\n    <div class="tut-video-grid">`;
  data.videos.forEach((v, idx) => {
    const editVideoBtn = adminMode ? `<button class="admin-edit-btn" style="margin-top:6px;" onclick="abrirEdicaoTutVideo('${cat}', ${idx})">✏️ Editar</button>\n             <button class="admin-danger-btn" style="margin-top:6px;margin-left:6px;" onclick="excluirTutVideo('${cat}', ${idx})">🗑️ Excluir</button>` : "";
    if (v.url) {
      html += `<div class="tut-video-card">\n        <div class="tut-video-thumb">\n          <iframe src="${v.url}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n        </div>\n        <div class="tut-video-info">\n          <span class="tut-video-tag">${v.tag}</span>\n          <div class="tut-video-title">${v.titulo}</div>\n          <div class="tut-video-desc">${v.desc}</div>\n          ${editVideoBtn}\n        </div>\n      </div>`;
    } else {
      html += `<div class="tut-video-card">\n        <div class="tut-video-thumb" style="cursor:default">\n          <div class="play-overlay" style="flex-direction:column;gap:8px;font-size:14px;color:var(--roxo);font-weight:500">\n            <span style="font-size:36px">🎬</span>\n            Em breve\n          </div>\n        </div>\n        <div class="tut-video-info">\n          <span class="tut-video-tag">${v.tag}</span>\n          <div class="tut-video-title">${v.titulo}</div>\n          <div class="tut-video-desc">${v.desc}</div>\n          ${editVideoBtn}\n        </div>\n      </div>`;
    }
  });
  if (adminMode) {
    html += `\n      <button class="tut-add-video-card" onclick="abrirNovoTutVideo('${cat}')">\n        <span class="icon">➕</span>\n        Adicionar vídeo\n      </button>`;
  }
  html += `</div>`;
  area.innerHTML = html;
}

function abrirEdicaoTutCategoria(cat) {
  const data = TUTORIAIS[cat];
  if (!data) return;
  const area = document.getElementById("tut-content");
  area.innerHTML = `\n        <div class="regras-detail-card">\n          <div class="regras-detail-header">\n            <div class="regras-detail-icon">✏️</div>\n            <div><h2>Editando categoria</h2></div>\n          </div>\n          <div class="regras-detail-content">\n            <div class="admin-inline-form">\n              <label>Título da categoria</label>\n              <input type="text" id="admin-tutcat-titulo" value="${escapeHtmlRegra(data.titulo)}">\n              <label>Descrição da categoria</label>\n              <input type="text" id="admin-tutcat-desc" value="${escapeHtmlRegra(data.desc)}">\n              <div style="display:flex;gap:8px;">\n                <button class="admin-edit-btn save" onclick="salvarEdicaoTutCategoria('${cat}')">💾 Salvar</button>\n                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="document.querySelector('.tut-cat-btn.active').click()">Cancelar</button>\n              </div>\n            </div>\n          </div>\n        </div>`;
}

function salvarEdicaoTutCategoria(cat) {
  const data = TUTORIAIS[cat];
  if (!data) return;
  data.titulo = document.getElementById("admin-tutcat-titulo").value.trim();
  data.desc = document.getElementById("admin-tutcat-desc").value.trim();
  renderTutCats();
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cat}"]`);
  setTutCat(btnAtivo, cat);
  mostrarFlashSalvo(document.querySelector("#tut-content"));
  resyncDataBlock("tutoriais", TUTORIAIS);
}

function abrirEdicaoTutVideo(cat, idx) {
  const data = TUTORIAIS[cat];
  const v = data && data.videos[idx];
  if (!v) return;
  const area = document.getElementById("tut-content");
  area.innerHTML = `\n        <div class="regras-detail-card">\n          <div class="regras-detail-header">\n            <div class="regras-detail-icon">✏️</div>\n            <div><h2>Editando tutorial</h2></div>\n          </div>\n          <div class="regras-detail-content">\n            <div class="admin-inline-form">\n              <label>Etiqueta (tag)</label>\n              <input type="text" id="admin-tutvid-tag" value="${escapeHtmlRegra(v.tag || "")}">\n              <label>Título do vídeo</label>\n              <input type="text" id="admin-tutvid-titulo" value="${escapeHtmlRegra(v.titulo || "")}">\n              <label>Descrição do vídeo</label>\n              <textarea id="admin-tutvid-desc">${escapeHtmlRegra(v.desc || "")}</textarea>\n              <label>URL do vídeo (formato embed do YouTube, deixe em branco para "Em breve")</label>\n              <input type="text" id="admin-tutvid-url" value="${escapeHtmlRegra(v.url || "")}">\n              <div style="display:flex;gap:8px;">\n                <button class="admin-edit-btn save" onclick="salvarEdicaoTutVideo('${cat}', ${idx})">💾 Salvar</button>\n                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="document.querySelector('.tut-cat-btn.active').click()">Cancelar</button>\n              </div>\n            </div>\n          </div>\n        </div>`;
}

function salvarEdicaoTutVideo(cat, idx) {
  const data = TUTORIAIS[cat];
  const v = data && data.videos[idx];
  if (!v) return;
  v.tag = document.getElementById("admin-tutvid-tag").value.trim();
  v.titulo = document.getElementById("admin-tutvid-titulo").value.trim();
  v.desc = document.getElementById("admin-tutvid-desc").value.trim();
  v.url = document.getElementById("admin-tutvid-url").value.trim();
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cat}"]`);
  setTutCat(btnAtivo, cat);
  mostrarFlashSalvo(document.querySelector("#tut-content"));
  resyncDataBlock("tutoriais", TUTORIAIS);
}

function excluirTutVideo(cat, idx) {
  const data = TUTORIAIS[cat];
  const v = data && data.videos[idx];
  if (!v) return;
  if (!confirm(`Excluir o vídeo "${v.titulo || "sem título"}"?`)) return;
  data.videos.splice(idx, 1);
  resyncDataBlock("tutoriais", TUTORIAIS);
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cat}"]`);
  setTutCat(btnAtivo, cat);
}

function abrirNovaTutCategoria() {
  const area = document.getElementById("tut-content");
  area.innerHTML = `\n        <div class="regras-detail-card">\n          <div class="regras-detail-header">\n            <div class="regras-detail-icon">➕</div>\n            <div><h2>Nova categoria</h2></div>\n          </div>\n          <div class="regras-detail-content">\n            <div class="admin-inline-form">\n              <label>Emoji da categoria</label>\n              <input type="text" id="admin-newcat-icon" placeholder="Ex.: 📁" maxlength="4" style="max-width:80px;">\n              <label>Nome da categoria</label>\n              <input type="text" id="admin-newcat-nome" placeholder="Ex.: Ouvidoria">\n              <div style="display:flex;gap:8px;">\n                <button class="admin-edit-btn save" onclick="salvarNovaTutCategoria()">💾 Salvar</button>\n                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="initTutorialsScreen()">Cancelar</button>\n              </div>\n            </div>\n          </div>\n        </div>`;
  setTimeout(() => document.getElementById("admin-newcat-icon")?.focus(), 50);
}

function salvarNovaTutCategoria() {
  const icon = document.getElementById("admin-newcat-icon").value.trim() || "📁";
  const nome = document.getElementById("admin-newcat-nome").value.trim();
  if (!nome) {
    alert("Digite um nome para a categoria.");
    return;
  }
  let base = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "categoria";
  let key = base, n = 2;
  while (TUTORIAIS[key]) {
    key = `${base}-${n++}`;
  }
  TUTORIAIS[key] = {
    icon: icon,
    label: nome,
    titulo: `${icon} ${nome}`,
    desc: "",
    videos: []
  };
  renderTutCats();
  resyncDataBlock("tutoriais", TUTORIAIS);
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${key}"]`);
  setTutCat(btnAtivo, key);
  mostrarFlashSalvo(document.querySelector("#tut-content"));
}

function abrirNovoTutVideo(cat) {
  const area = document.getElementById("tut-content");
  area.innerHTML = `\n        <div class="regras-detail-card">\n          <div class="regras-detail-header">\n            <div class="regras-detail-icon">➕</div>\n            <div><h2>Novo vídeo</h2></div>\n          </div>\n          <div class="regras-detail-content">\n            <div class="admin-inline-form">\n              <label>Etiqueta (tag)</label>\n              <input type="text" id="admin-tutvid-tag">\n              <label>Título do vídeo</label>\n              <input type="text" id="admin-tutvid-titulo">\n              <label>Descrição do vídeo</label>\n              <textarea id="admin-tutvid-desc"></textarea>\n              <label>URL do vídeo (formato embed do YouTube, deixe em branco para "Em breve")</label>\n              <input type="text" id="admin-tutvid-url">\n              <div style="display:flex;gap:8px;">\n                <button class="admin-edit-btn save" onclick="salvarNovoTutVideo('${cat}')">💾 Salvar</button>\n                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="document.querySelector('.tut-cat-btn[data-cat=\\'${cat}\\']').click()">Cancelar</button>\n              </div>\n            </div>\n          </div>\n        </div>`;
  setTimeout(() => document.getElementById("admin-tutvid-tag")?.focus(), 50);
}

function salvarNovoTutVideo(cat) {
  const data = TUTORIAIS[cat];
  if (!data) return;
  data.videos.push({
    tag: document.getElementById("admin-tutvid-tag").value.trim(),
    titulo: document.getElementById("admin-tutvid-titulo").value.trim() || "Novo vídeo",
    desc: document.getElementById("admin-tutvid-desc").value.trim(),
    url: document.getElementById("admin-tutvid-url").value.trim()
  });
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cat}"]`);
  setTutCat(btnAtivo, cat);
  mostrarFlashSalvo(document.querySelector("#tut-content"));
  resyncDataBlock("tutoriais", TUTORIAIS);
}
