/**
 * IBREP Prism — Módulo: Painel Institucional
 * -----------------------------------------------------
 * Tudo que é específico da tela "Painel Institucional" (busca global,
 * categorias fixas e custom, árvore hierárquica, lista e detalhe de
 * Mantenedoras/Instituições/Polos/Locais de Provas, e o CRUD desses
 * registros) mora aqui.
 *
 * Carregado de forma "eager" (normal <script src>) no index.html, porque
 * `aplicarDadosSalvos()` já espera encontrar `DB`, `cfg`, `sectionGroups`
 * e `PAINEL_CATEGORIAS_EXTRAS` prontos assim que a página carrega. O
 * HTML da tela (telas/painel.html) é que é carregado sob demanda, só
 * quando o usuário abre o Painel Institucional pela primeira vez (veja
 * garantirTelaPainel() no script principal).
 */

function openPanel() {
  if (!exigirPermissao("painel")) return;
  irParaTela("panel");
}

const DB = {
  mantenedoras: [],
  instituicoes: [],
  polos: [],
  locais: []
};

const cfg = {
  mantenedoras: {
    label: "Mantenedoras",
    idKey: "idmantenedora",
    nameKey: "razao_social"
  },
  instituicoes: {
    label: "Instituições",
    idKey: "idinstituicao",
    nameKey: "nome_abreviado"
  },
  polos: {
    label: "Polos",
    idKey: "idpolo",
    nameKey: "nome_fantasia"
  },
  locais: {
    label: "Locais de Provas",
    idKey: "idlocal",
    nameKey: "nome"
  }
};

const labelMap = {
  idmantenedora: "ID Mantenedora",
  idinstituicao: "ID Instituição",
  idpolo: "ID Polo",
  idlocal: "ID Local",
  razao_social: "Razão social",
  nome_fantasia: "Nome fantasia",
  nome_abreviado: "Nome abreviado",
  nome: "Nome",
  documento: "Documento (CNPJ/CPF)",
  email: "E-mail",
  telefone: "Telefone",
  cep: "CEP",
  endereco: "Endereço",
  bairro: "Bairro",
  complemento: "Complemento",
  cidade: "Cidade",
  estado: "Estado",
  gerente_nome: "Nome do gerente",
  gerente_telefone: "Tel. gerente",
  gerente_celular: "Cel. gerente",
  gerente_email: "E-mail gerente",
  data_credenciamento: "Data de credenciamento",
  data_vencimento: "Data de vencimento",
  portaria_secretario: "Portaria secretário",
  portaria_diretor: "Portaria diretor",
  nome_secretario: "Nome secretário",
  nome_diretor: "Nome diretor"
};

const sectionGroups = {
  mantenedoras: [ {
    title: "Identificação",
    keys: [ "idmantenedora", "razao_social", "nome_fantasia", "documento" ]
  }, {
    title: "Contato",
    keys: [ "email", "telefone" ]
  }, {
    title: "Endereço",
    keys: [ "cep", "endereco", "bairro", "complemento", "cidade", "estado" ]
  }, {
    title: "Responsável",
    keys: [ "gerente_nome", "gerente_email" ]
  }, {
    title: "Credenciamento",
    keys: [ "data_credenciamento", "data_vencimento" ]
  } ],
  instituicoes: [ {
    title: "Identificação",
    keys: [ "idmantenedora", "idinstituicao", "nome", "nome_abreviado", "documento" ]
  }, {
    title: "Contato",
    keys: [ "email", "telefone" ]
  }, {
    title: "Endereço",
    keys: [ "cep", "endereco", "bairro", "complemento", "cidade", "estado" ]
  }, {
    title: "Responsável",
    keys: [ "gerente_nome", "gerente_email" ]
  }, {
    title: "Credenciamento",
    keys: [ "data_credenciamento", "data_vencimento" ]
  } ],
  polos: [ {
    title: "Identificação",
    keys: [ "idmantenedora", "idinstituicao", "idpolo", "razao_social", "nome_fantasia", "documento" ]
  }, {
    title: "Contato",
    keys: [ "email", "telefone" ]
  }, {
    title: "Endereço",
    keys: [ "cep", "endereco", "bairro", "complemento", "cidade", "estado" ]
  }, {
    title: "Responsável",
    keys: [ "gerente_nome", "gerente_telefone", "gerente_celular", "gerente_email" ]
  }, {
    title: "Credenciamento",
    keys: [ "data_credenciamento", "data_vencimento" ]
  } ],
  locais: [ {
    title: "Identificação",
    keys: [ "idinstituicao", "idpolo", "idlocal", "nome" ]
  }, {
    title: "Contato",
    keys: [ "email", "telefone" ]
  }, {
    title: "Endereço",
    keys: [ "cep", "endereco", "bairro", "complemento", "cidade", "estado" ]
  }, {
    title: "Responsável",
    keys: [ "gerente_nome", "gerente_telefone", "gerente_celular", "gerente_email" ]
  } ]
};

const PAINEL_CATEGORIAS_FIXAS = [
  { id: "mantenedoras", titulo: "Mantenedoras" },
  { id: "instituicoes", titulo: "Instituições" },
  { id: "polos", titulo: "Polos" },
  { id: "locais", titulo: "Locais de Provas" }
];

const PAINEL_CATEGORIAS_EXTRAS = [];


function registrarCategoriaPainelCustom(cat) {
  if (!DB[cat.id]) DB[cat.id] = [];
  cfg[cat.id] = {
    label: cat.titulo,
    idKey: "id",
    nameKey: "nome"
  };
  sectionGroups[cat.id] = [ {
    title: "Identificação",
    keys: [ "id", "nome" ]
  } ];
  if (!labelMap.id) labelMap.id = "ID";
}

function painelCategoriasTodas() {
  return [ ...PAINEL_CATEGORIAS_FIXAS, ...PAINEL_CATEGORIAS_EXTRAS ];
}

function persistirRegistrosSecao(section) {
  const ehFixa = PAINEL_CATEGORIAS_FIXAS.some(c => c.id === section);
  if (ehFixa) {
    resyncDataBlock("db", DB);
  } else {
    resyncDataBlock("painelitens_" + section, DB[section] || []);
  }
}

const SECOES_TABELA_REAL = { mantenedoras: "mantenedora", instituicoes: "instituicao", polos: "polo", locais: "local" };

function dbCacheLocal() {
  try {
    localStorage.setItem(LS_PREFIX + "db", JSON.stringify(DB));
  } catch (e) {
    console.warn("Não foi possível salvar o cache local do painel institucional:", e);
  }
}

async function persistirRegistroInstitucional(section, item) {
  const tipo = SECOES_TABELA_REAL[section];
  if (!tipo) { persistirRegistrosSecao(section); return; }
  dbCacheLocal();
  try {
    const data = await supabaseRpc("salvar_" + tipo, { p_admin_senha: adminSenha, p_dado: item });
    if (!data.ok) {
      alert("⚠️ O registro foi salvo apenas neste navegador — falha ao sincronizar com o banco de dados: " + (data.erro || ""));
    } else if (data.id !== undefined && data.id !== null) {
      item[cfg[section].idKey] = data.id;
    }
  } catch (e) {
    console.warn("Supabase: falha ao salvar " + tipo + " na nuvem.", e);
    alert("⚠️ O registro foi salvo apenas neste navegador — houve uma falha ao sincronizar com o banco de dados.");
  }
}

async function excluirRegistroInstitucional(section, id) {
  const tipo = SECOES_TABELA_REAL[section];
  if (!tipo) { persistirRegistrosSecao(section); return; }
  dbCacheLocal();
  try {
    const data = await supabaseRpc("excluir_" + tipo, { p_admin_senha: adminSenha, p_id: id });
    if (!data.ok) {
      alert("⚠️ Falha ao excluir na nuvem: " + (data.erro || "") + " — o registro pode voltar a aparecer ao recarregar.");
    }
  } catch (e) {
    console.warn("Supabase: falha ao excluir " + tipo + " na nuvem.", e);
    alert("⚠️ Falha ao excluir na nuvem — o registro pode voltar a aparecer ao recarregar.");
  }
}

function renderPainelCats() {
  const cont = document.getElementById("painel-cats-list");
  if (!cont) return;
  let numero = 0;
  let html = "";
  painelCategoriasTodas().forEach(cat => {
    numero++;
    const ativo = cat.id === currentSection ? "active" : "";
    const qtd = (DB[cat.id] || []).length;
    const ehCustom = PAINEL_CATEGORIAS_EXTRAS.some(c => c.id === cat.id);
    const delBtn = adminMode && ehCustom ? `<span class="regras-cat-del" data-del-painel-cat="${cat.id}" title="Excluir categoria">🗑️</span>` : "";
    html += `
          <button class="regras-cat-btn ${ativo}" data-painel-cat="${cat.id}">
            <span class="regras-cat-num" data-num="${numero}"></span>
            <span class="regras-cat-label">${cat.titulo}</span>
            <span class="regras-cat-count">${qtd}</span>
            ${delBtn}
          </button>`;
  });
  const arvoreAtiva = currentSection === "arvore" ? "active" : "";
  html += `
          <button class="regras-cat-btn ${arvoreAtiva}" data-painel-cat="arvore">
            <span class="regras-cat-num" data-num="🌳"></span>
            <span class="regras-cat-label">Árvore Hierárquica</span>
          </button>`;
  cont.innerHTML = html;
  cont.querySelectorAll("[data-painel-cat]").forEach(btn => {
    btn.addEventListener("click", e => {
      if (e.target.closest("[data-del-painel-cat]")) return;
      setSection(btn.getAttribute("data-painel-cat"));
    });
  });
  cont.querySelectorAll("[data-del-painel-cat]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      excluirCategoriaPainel(el.getAttribute("data-del-painel-cat"));
    });
  });
}

function abrirNovaCategoriaPainel() {
  const nome = prompt("Nome da nova categoria:");
  if (nome === null) return;
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    alert("Digite um nome para a categoria.");
    return;
  }
  let base = nomeLimpo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "categoria";
  let id = base, n = 2;
  while (cfg[id]) {
    id = `${base}-${n++}`;
  }
  const novaCat = {
    id,
    titulo: nomeLimpo
  };
  PAINEL_CATEGORIAS_EXTRAS.push(novaCat);
  registrarCategoriaPainelCustom(novaCat);
  resyncDataBlock("painelcats", PAINEL_CATEGORIAS_EXTRAS);
  setSection(id);
}

function excluirCategoriaPainel(id) {
  const idx = PAINEL_CATEGORIAS_EXTRAS.findIndex(c => c.id === id);
  if (idx === -1) return;
  const cat = PAINEL_CATEGORIAS_EXTRAS[idx];
  const qtd = (DB[id] || []).length;
  const aviso = qtd > 0 ? ` e ${qtd} registro(s) cadastrados nela` : "";
  if (!confirm(`Excluir a categoria "${cat.titulo}"${aviso}? Essa ação não pode ser desfeita.`)) return;
  PAINEL_CATEGORIAS_EXTRAS.splice(idx, 1);
  delete DB[id];
  delete cfg[id];
  delete sectionGroups[id];
  resyncDataBlock("painelcats", PAINEL_CATEGORIAS_EXTRAS);
  if (currentSection === id) {
    setSection("mantenedoras");
  } else {
    renderPainelCats();
  }
}

let currentSection = "mantenedoras";

let allItems = [];

function initials(name) {
  if (!name || !name.trim()) return "?";
  return name.trim().charAt(0).toUpperCase();
}

function statusBadge(val) {
  if (!val || val.trim() === "") return '<span class="badge badge-nd">Não informado</span>';
  const d = new Date(val);
  const ok = d >= new Date;
  const label = val;
  return `<span class="badge ${ok ? "badge-ok" : "badge-exp"}">${label}</span>`;
}

function resolveIdLabel(key, val) {
  const id = Number(val);
  if (key === "idmantenedora") {
    const m = DB.mantenedoras.find(x => x.idmantenedora === id);
    return m ? `${id} — ${m.razao_social || m.nome_fantasia}` : val;
  }
  if (key === "idinstituicao") {
    const i = DB.instituicoes.find(x => x.idinstituicao === id);
    return i ? `${id} — ${i.nome_abreviado || i.nome}` : val;
  }
  if (key === "idpolo") {
    const p = DB.polos.find(x => x.idpolo === id);
    return p ? `${id} — ${p.nome_fantasia || p.razao_social}` : val;
  }
  if (key === "idlocal") {
    const l = DB.locais.find(x => x.idlocal === id);
    return l ? `${id} — ${l.nome || l.razao_social}` : val;
  }
  return val;
}

function renderDetail(item) {
  const c = cfg[currentSection];
  const groups = sectionGroups[currentSection];
  const name = item[c.nameKey] || item.nome || item.razao_social || "—";
  const id = item[c.idKey];
  let html = `<div class="detail-card">`;
  html += `<div class="detail-card-header">\n    <div class="detail-avatar">${initials(name)}</div>\n    <div class="detail-header-info">\n      <h2>${name}</h2>\n      <p>ID ${id} &nbsp;·&nbsp; ${c.label.replace(/s$/, "")}</p>\n    </div>\n  </div>`;
  html += `<div class="field-section">`;
  groups.forEach(group => {
    const rows = group.keys.filter(k => (typeof adminMode !== "undefined" && adminMode) || (item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== ""));
    if (rows.length === 0) return;
    html += `<div class="field-section-title">${group.title}</div>`;
    rows.forEach(k => {
      const label = labelMap[k] || k;
      let val = item[k] !== undefined && item[k] !== null ? String(item[k]) : "";
      if (k === "data_credenciamento" || k === "data_vencimento") val = statusBadge(item[k]); else if (val && [ "idmantenedora", "idinstituicao", "idpolo", "idlocal" ].includes(k)) val = resolveIdLabel(k, item[k]);
      html += `<div class="field-row">\n        <div class="field-key">${label}</div>\n        <div class="field-val">${val}</div>\n      </div>`;
    });
  });
  html += `</div></div>`;
  document.getElementById("detail-pane").innerHTML = html;
}

// getCurriculosForCursoInst, cargaTexto, selectCurso e selectCurriculo
// agora moram em js/cursos.js.

function nodeMatches(text, q) {
  return q === "" || String(text).toLowerCase().includes(q);
}

function buildTreeHTML(q) {
  q = (q || "").trim().toLowerCase();
  let html = "";
  let totalM = 0, totalI = 0, totalP = 0, totalL = 0;
  listaOrdenadaPorId("mantenedoras").forEach(m => {
    const mNome = m.razao_social || m.nome_fantasia || "";
    const mSelfMatch = nodeMatches(mNome, q) || nodeMatches(m.idmantenedora, q);
    const instituicoes = DB.instituicoes.filter(i => i.idmantenedora === m.idmantenedora).sort((a, b) => Number(a.idinstituicao) - Number(b.idinstituicao));
    let instHtml = "";
    let mantenedoraTemMatch = mSelfMatch;
    instituicoes.forEach(inst => {
      const iNome = inst.nome_abreviado || inst.nome || "";
      const iSelfMatch = nodeMatches(iNome, q) || nodeMatches(inst.idinstituicao, q);
      const polos = DB.polos.filter(p => p.idinstituicao === inst.idinstituicao).sort((a, b) => Number(a.idpolo) - Number(b.idpolo));
      let poloHtml = "";
      let instTemMatch = iSelfMatch || mSelfMatch;
      polos.forEach(polo => {
        const pNome = polo.nome_fantasia || polo.razao_social || "";
        const pSelfMatch = nodeMatches(pNome, q) || nodeMatches(polo.idpolo, q);
        const locais = DB.locais.filter(l => l.idpolo === polo.idpolo).sort((a, b) => Number(a.idlocal) - Number(b.idlocal));
        let localHtml = "";
        let poloTemMatch = pSelfMatch || iSelfMatch || mSelfMatch;
        locais.forEach(local => {
          const lNome = local.nome || "";
          const lSelfMatch = nodeMatches(lNome, q) || nodeMatches(local.idlocal, q);
          const localTemMatch = lSelfMatch || pSelfMatch || iSelfMatch || mSelfMatch;
          if (!localTemMatch) return;
          poloTemMatch = true;
          totalL++;
          localHtml += `\n            <div class="tree-node tree-local" onclick="treeSelectItem(event,'locais',${local.idlocal},this)">\n              <span class="tree-icon">📝</span>\n              <span class="tree-name" style="flex:1;padding:0;margin:0;">${lNome}</span>\n              <span class="tree-id">#${local.idlocal}</span>\n            </div>`;
        });
        if (!poloTemMatch) return;
        instTemMatch = true;
        totalP++;
        poloHtml += `\n          <div class="tree-node tree-polo">\n            <div class="tree-node-header" onclick="toggleTreeNode(this, event)">\n              <span class="tree-toggle">${localHtml ? "▸" : ""}</span>\n              <span class="tree-icon">📍</span>\n              <span class="tree-name" onclick="treeSelectItem(event,'polos',${polo.idpolo},this)">${pNome}</span>\n              <span class="tree-badge">${locais.length}</span>\n            </div>\n            ${localHtml ? `<div class="tree-children">${localHtml}</div>` : ""}\n          </div>`;
      });
      if (!instTemMatch) return;
      mantenedoraTemMatch = true;
      totalI++;
      instHtml += `\n        <div class="tree-node tree-inst">\n          <div class="tree-node-header" onclick="toggleTreeNode(this, event)">\n            <span class="tree-toggle">${poloHtml ? "▸" : ""}</span>\n            <span class="tree-icon">🏫</span>\n            <span class="tree-name" onclick="treeSelectItem(event,'instituicoes',${inst.idinstituicao},this)">${iNome}</span>\n            <span class="tree-badge">${polos.length}</span>\n          </div>\n          ${poloHtml ? `<div class="tree-children">${poloHtml}</div>` : ""}\n        </div>`;
    });
    if (!mantenedoraTemMatch) return;
    totalM++;
    html += `\n      <div class="tree-node tree-mant">\n        <div class="tree-node-header" onclick="toggleTreeNode(this, event)">\n          <span class="tree-toggle">${instHtml ? "▸" : ""}</span>\n          <span class="tree-icon">🏢</span>\n          <span class="tree-name" onclick="treeSelectItem(event,'mantenedoras',${m.idmantenedora},this)">${mNome}</span>\n          <span class="tree-badge">${instituicoes.length}</span>\n        </div>\n        ${instHtml ? `<div class="tree-children">${instHtml}</div>` : ""}\n      </div>`;
  });
  document.getElementById("list-count").textContent = `${totalM} mantenedora(s) · ${totalI} instituição(ões) · ${totalP} polo(s) · ${totalL} local(is)`;
  return html || `<div class="tree-empty">Nenhum resultado encontrado</div>`;
}

function renderTree(q) {
  document.getElementById("list-items").innerHTML = buildTreeHTML(q);
  if (q && q.trim() !== "") {
    document.querySelectorAll("#list-items .tree-node-header").forEach(h => {
      const children = h.nextElementSibling;
      if (children && children.classList.contains("tree-children")) {
        children.classList.add("open");
        const t = h.querySelector(".tree-toggle");
        if (t && t.textContent) t.textContent = "▾";
      }
    });
  }
}

function toggleTreeNode(headerEl, evt) {
  if (evt) evt.stopPropagation();
  const children = headerEl.nextElementSibling;
  if (!children || !children.classList.contains("tree-children")) return;
  const isOpen = children.classList.toggle("open");
  const t = headerEl.querySelector(".tree-toggle");
  if (t && t.textContent) t.textContent = isOpen ? "▾" : "▸";
}

function treeSelectItem(evt, type, id, el) {
  if (evt) evt.stopPropagation();
  document.querySelectorAll("#list-items .tree-name.active, #list-items .tree-local.active").forEach(x => x.classList.remove("active"));
  el.classList.add("active");
  const idKey = cfg[type].idKey;
  const item = DB[type].find(x => x[idKey] === id);
  if (!item) return;
  const prevSection = currentSection;
  currentSection = type;
  renderDetail(item);
  currentSection = prevSection;
}

function renderList(items) {
  const c = cfg[currentSection];
  const container = document.getElementById("list-items");
  container.innerHTML = "";
  items.forEach(item => {
    const id = item[c.idKey];
    const name = item[c.nameKey] || item.nome || item.razao_social || "—";
    const el = document.createElement("div");
    el.className = "list-item";
    el.dataset.id = id;
    el.innerHTML = `\n      <div class="item-avatar">${initials(name)}</div>\n      <div class="item-info">\n        <div class="item-id">ID ${id}</div>\n        <div class="item-name">${name}</div>\n      </div>`;
    el.onclick = () => {
      document.querySelectorAll(".list-item").forEach(e => e.classList.remove("active"));
      el.classList.add("active");
      renderDetail(item);
    };
    container.appendChild(el);
  });
  document.getElementById("list-count").textContent = items.length + " registro" + (items.length !== 1 ? "s" : "");
}

function listaOrdenadaPorId(section) {
  const idKey = cfg[section].idKey;
  return (DB[section] || []).slice().sort((a, b) => Number(a[idKey]) - Number(b[idKey]));
}

function filterList() {
  const q = document.getElementById("search-input").value.toLowerCase();
  if (currentSection === "arvore") {
    renderTree(q);
    return;
  }
  const c = cfg[currentSection];
  const filtered = allItems.filter(item => {
    const name = (item[c.nameKey] || item.nome || item.razao_social || "").toLowerCase();
    const id = String(item[c.idKey]);
    return name.includes(q) || id.includes(q);
  });
  renderList(filtered);
}

function setSection(section) {
  currentSection = section;
  renderPainelCats();
  document.getElementById("search-input").value = "";
  document.getElementById("detail-pane").innerHTML = `\n    <div class="empty-state">\n      <div class="empty-icon"></div>\n      <p>Selecione um item para ver os detalhes</p>\n    </div>`;
  const addBtn = document.getElementById("btn-add-registro");
  if (section === "arvore") {
    document.getElementById("list-title").textContent = "Árvore Hierárquica";
    document.getElementById("search-input").placeholder = "Buscar mantenedora, instituição, polo ou local...";
    if (addBtn) addBtn.style.display = "none";
    renderTree("");
    return;
  }
  if (addBtn) {
    addBtn.style.display = "";
    addBtn.textContent = "➕ Adicionar " + (cfg[section].label.replace(/s$/, "").toLowerCase() === "instituiçõe" ? "instituição" : cfg[section].label.toLowerCase().replace(/s$/, ""));
  }
  document.getElementById("search-input").placeholder = "Buscar...";
  allItems = listaOrdenadaPorId(section);
  document.getElementById("list-title").textContent = cfg[section].label;
  renderList(allItems);
}

function globalSearch(q) {
  const box = document.getElementById("global-search-results");
  q = q.trim().toLowerCase();
  if (!q) {
    box.classList.remove("open");
    box.innerHTML = "";
    return;
  }
  const sections = [ {
    key: "mantenedoras",
    label: "Mantenedoras",
    idKey: "idmantenedora",
    nameKey: "razao_social"
  }, {
    key: "instituicoes",
    label: "Instituições",
    idKey: "idinstituicao",
    nameKey: "nome"
  }, {
    key: "polos",
    label: "Polos",
    idKey: "idpolo",
    nameKey: "razao_social"
  }, {
    key: "locais",
    label: "Locais de Provas",
    idKey: "idlocal",
    nameKey: "razao_social"
  } ];
  let html = "";
  let total = 0;
  sections.forEach(s => {
    const hits = (DB[s.key] || []).filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(q)));
    if (!hits.length) return;
    html += `<div class="gs-section-title">${s.label} (${hits.length})</div>`;
    hits.forEach(item => {
      const id = item[s.idKey];
      const name = item[s.nameKey] || item.nome || "—";
      const av = initials(name);
      html += `<div class="gs-item" onclick="goToItem('${s.key}', ${id})">\n        <div class="gs-avatar">${av}</div>\n        <div class="gs-info">\n          <div class="gs-name">${name}</div>\n          <div class="gs-meta">ID ${id} · ${s.label}</div>\n        </div>\n      </div>`;
    });
    total += hits.length;
  });
  if (!total) html = `<div class="gs-empty">Nenhum resultado encontrado</div>`;
  box.innerHTML = html;
  box.classList.add("open");
}

function goToItem(section, id) {
  document.getElementById("global-search-results").classList.remove("open");
  document.getElementById("global-search-input").value = "";
  setSection(section);
  const c = cfg[section];
  const item = DB[section].find(i => i[c.idKey] === id);
  if (!item) return;
  setTimeout(() => {
    const el = document.querySelector(`.list-item[data-id="${id}"]`);
    if (el) {
      document.querySelectorAll(".list-item").forEach(e => e.classList.remove("active"));
      el.classList.add("active");
      el.scrollIntoView({
        block: "center"
      });
      renderDetail(item);
    }
  }, 50);
}

document.addEventListener("click", e => {
  if (!e.target.closest(".global-search-wrap")) {
    document.getElementById("global-search-results")?.classList.remove("open");
  }
});

const FK_ORIGEM = {
  idmantenedora: {
    secao: "mantenedoras",
    idKey: "idmantenedora"
  },
  idinstituicao: {
    secao: "instituicoes",
    idKey: "idinstituicao"
  },
  idpolo: {
    secao: "polos",
    idKey: "idpolo"
  },
  idlocal: {
    secao: "locais",
    idKey: "idlocal"
  }
};

function irParaRegistroOrigem(key, idVal) {
  const origem = FK_ORIGEM[key];
  if (!origem) return;
  const id = Number(idVal);
  const item = (DB[origem.secao] || []).find(x => x[origem.idKey] === id);
  if (!item) return;
  setSection(origem.secao);
  const el = document.querySelector(`.list-item[data-id="${id}"]`);
  if (el) {
    document.querySelectorAll(".list-item").forEach(e => e.classList.remove("active"));
    el.classList.add("active");
    el.scrollIntoView({
      block: "nearest"
    });
  }
  renderDetail(item);
}

const _renderDetailOriginal = renderDetail;

renderDetail = function(item) {
  _renderDetailOriginal(item);
  if (!adminMode) return;
  const c = cfg[currentSection];
  const headerNameEl = document.querySelector("#detail-pane .detail-header-info h2");
  if (headerNameEl && c.nameKey) {
    headerNameEl.classList.add("admin-editable");
    headerNameEl.setAttribute("contenteditable", "true");
    headerNameEl.title = "Editar nome — atualiza em todos os lugares que puxam este registro";
    headerNameEl.addEventListener("blur", () => {
      const novoValor = headerNameEl.textContent.trim();
      if (!novoValor || novoValor === String(item[c.nameKey])) return;
      item[c.nameKey] = novoValor;
      persistirRegistroInstitucional(currentSection, item);
      mostrarFlashSalvo(headerNameEl.parentElement);
      const listEl = document.querySelector(`.list-item[data-id="${item[c.idKey]}"] .item-name`);
      if (listEl) listEl.textContent = novoValor;
      const avatarEl = document.querySelector("#detail-pane .detail-avatar");
      if (avatarEl) avatarEl.textContent = initials(novoValor);
      const rowLabel = labelMap[c.nameKey];
      document.querySelectorAll("#detail-pane .field-row").forEach(row => {
        if (row.querySelector(".field-key")?.textContent === rowLabel) {
          const fv = row.querySelector(".field-val");
          if (fv) fv.textContent = novoValor;
        }
      });
    });
  }
  document.querySelectorAll("#detail-pane .field-row").forEach(row => {
    const keyLabel = row.querySelector(".field-key")?.textContent;
    const valEl = row.querySelector(".field-val");
    if (!valEl || !keyLabel) return;
    const key = Object.keys(labelMap).find(k => labelMap[k] === keyLabel);
    if (!key || item[key] === undefined) return;
    if (key === c.idKey) {
      valEl.classList.add("admin-editable");
      valEl.setAttribute("contenteditable", "true");
      valEl.title = "Editar o número do ID deste registro";
      valEl.addEventListener("blur", () => renumerarRegistro(currentSection, item, valEl, row));
      return;
    }
    if (FK_ORIGEM[key]) {
      valEl.classList.add("admin-fk-link");
      valEl.style.cursor = "pointer";
      valEl.title = "Editar na origem — a mudança vale em todos os lugares que mostram esse nome";
      valEl.addEventListener("click", () => irParaRegistroOrigem(key, item[key]));
      return;
    }
    valEl.classList.add("admin-editable");
    valEl.setAttribute("contenteditable", "true");
    valEl.addEventListener("blur", () => {
      const novoValor = valEl.textContent.trim();
      if (novoValor === String(item[key])) return;
      item[key] = novoValor;
      persistirRegistroInstitucional(currentSection, item);
      mostrarFlashSalvo(row);
      if (key === c.nameKey) {
        if (headerNameEl) headerNameEl.textContent = novoValor;
        const listEl = document.querySelector(`.list-item[data-id="${item[c.idKey]}"] .item-name`);
        if (listEl) listEl.textContent = novoValor;
        const avatarEl = document.querySelector("#detail-pane .detail-avatar");
        if (avatarEl) avatarEl.textContent = initials(novoValor);
      }
    });
  });
  const headerActions = document.querySelector("#detail-pane .detail-card-header");
  if (headerActions) {
    const delBtn = document.createElement("button");
    delBtn.className = "admin-danger-btn";
    delBtn.style.marginLeft = "auto";
    delBtn.textContent = "🗑️ Excluir registro";
    delBtn.onclick = () => excluirRegistro(currentSection, item[c.idKey]);
    headerActions.appendChild(delBtn);
  }
};

function renumerarRegistro(section, item, valEl, row) {
  const c = cfg[section];
  const idKey = c.idKey;
  const idAntigo = item[idKey];
  const texto = valEl.textContent.trim();
  const idNovo = Number(texto);

  if (!texto || !Number.isInteger(idNovo) || idNovo <= 0) {
    alert("O ID deve ser um número inteiro positivo.");
    valEl.textContent = idAntigo;
    return;
  }
  if (idNovo === idAntigo) {
    valEl.textContent = idAntigo;
    return;
  }
  const jaExiste = (DB[section] || []).some(x => x !== item && Number(x[idKey]) === idNovo);
  if (jaExiste) {
    alert(`Já existe um registro com o ID ${idNovo} nesta categoria. Escolha outro número.`);
    valEl.textContent = idAntigo;
    return;
  }
  if (!confirm(`Alterar o ID deste registro de ${idAntigo} para ${idNovo}?\n\nIsso também atualiza automaticamente as referências deste registro em outros cadastros vinculados (ex.: polos/locais).`)) {
    valEl.textContent = idAntigo;
    return;
  }

  item[idKey] = idNovo;

  // Atualiza referências (chaves estrangeiras) em outras seções que apontam para este registro
  const registrosAfetados = [ item ];
  Object.keys(DB).forEach(sec => {
    (DB[sec] || []).forEach(reg => {
      if (reg === item) return;
      if (reg[idKey] !== undefined && Number(reg[idKey]) === idAntigo) {
        reg[idKey] = idNovo;
        registrosAfetados.push(reg);
      }
    });
  });

  // Atualiza estruturas auxiliares usadas em "Cursos por Instituição" quando o registro é uma instituição
  if (idKey === "idinstituicao") {
    const chaveAntiga = String(idAntigo), chaveNova = String(idNovo);
    [ INSTITUICAO_CURSOS, CURSOS_ESTADO_REAL, CERTIFICADOS, PROVAS_IMPRESSAS ].forEach(obj => {
      if (obj && Object.prototype.hasOwnProperty.call(obj, chaveAntiga)) {
        obj[chaveNova] = obj[chaveAntiga];
        delete obj[chaveAntiga];
      }
    });
    const novoSetAtiv = new Set();
    ATIVIDADE_PRESENCIAL.forEach(chave => {
      const [ instId, cursoId ] = chave.split("-");
      novoSetAtiv.add(instId === chaveAntiga ? `${chaveNova}-${cursoId}` : chave);
    });
    ATIVIDADE_PRESENCIAL.clear();
    novoSetAtiv.forEach(v => ATIVIDADE_PRESENCIAL.add(v));
    try {
      localStorage.setItem(LS_PREFIX + "instituicaocursos", JSON.stringify(INSTITUICAO_CURSOS));
    } catch (e) {}
  }

  // Persiste todos os registros afetados
  registrosAfetados.forEach(reg => {
    const sec = Object.keys(DB).find(s => (DB[s] || []).includes(reg));
    if (sec) persistirRegistroInstitucional(sec, reg);
  });

  mostrarFlashSalvo(row);

  // Atualiza a interface: cabeçalho do detalhe, item na lista e reordena pela nova numeração
  const breadcrumbEl = document.querySelector("#detail-pane .detail-header-info p");
  if (breadcrumbEl) breadcrumbEl.innerHTML = `ID ${idNovo} &nbsp;·&nbsp; ${c.label.replace(/s$/, "")}`;
  const listEl = document.querySelector(`.list-item[data-id="${idAntigo}"]`);
  if (listEl) {
    listEl.dataset.id = idNovo;
    const idEl = listEl.querySelector(".item-id");
    if (idEl) idEl.textContent = "ID " + idNovo;
  }
  if (currentSection === section) {
    allItems = listaOrdenadaPorId(section);
    filterList();
    const novoEl = document.querySelector(`.list-item[data-id="${idNovo}"]`);
    if (novoEl) {
      document.querySelectorAll(".list-item").forEach(e => e.classList.remove("active"));
      novoEl.classList.add("active");
      novoEl.scrollIntoView({ block: "nearest" });
    }
  }
  renderPainelCats();
}

const REGISTRO_PARENT = {
  mantenedoras: null,
  instituicoes: {
    parentSection: "mantenedoras",
    fk: "idmantenedora",
    parentLabel: "mantenedora"
  },
  polos: {
    parentSection: "instituicoes",
    fk: "idinstituicao",
    parentLabel: "instituição"
  },
  locais: {
    parentSection: "polos",
    fk: "idpolo",
    parentLabel: "polo"
  }
};

function proximoId(section, idKey) {
  const itens = DB[section] || [];
  return itens.reduce((max, it) => Math.max(max, Number(it[idKey]) || 0), 0) + 1;
}

function abrirNovoRegistro(sectionParam) {
  const section = sectionParam || currentSection;
  if (section === "arvore") return;
  const c = cfg[section];
  const parentInfo = REGISTRO_PARENT[section];
  let fkValor = null;
  if (parentInfo) {
    const paisDisponiveis = (DB[parentInfo.parentSection] || []).map(p => `${p[cfg[parentInfo.parentSection].idKey]} — ${p[cfg[parentInfo.parentSection].nameKey] || p.nome || p.razao_social}`).join("\n");
    const digitado = prompt(`Qual o ID d${parentInfo.parentLabel === "instituição" ? "a" : "o"} ${parentInfo.parentLabel} deste novo registro?\n\nOpções disponíveis:\n${paisDisponiveis}`, "");
    if (digitado === null) return;
    fkValor = Number(digitado.trim());
    const paiExiste = (DB[parentInfo.parentSection] || []).some(p => p[cfg[parentInfo.parentSection].idKey] === fkValor);
    if (!fkValor || !paiExiste) {
      alert("ID inválido. Cadastro cancelado.");
      return;
    }
  }
  const nome = prompt(`Nome d${c.label.toLowerCase().startsWith("i") ? "a" : "a"} nov${c.label.match(/^(Mantenedoras|Instituições)/) ? "a" : "o"} ${c.label.replace(/s$/, "").toLowerCase()}:`, "");
  if (nome === null) return;
  const nomeLimpo = nome.trim() || "Novo registro";
  const novoId = proximoId(section, c.idKey);
  const novoItem = {
    [c.idKey]: novoId
  };
  if (parentInfo) novoItem[parentInfo.fk] = fkValor;
  novoItem[c.nameKey] = nomeLimpo;
  DB[section].push(novoItem);
  persistirRegistroInstitucional(section, novoItem);
  renderPainelCats();
  if (section === currentSection) {
    allItems = listaOrdenadaPorId(section);
    renderList(allItems);
    const el = document.querySelector(`.list-item[data-id="${novoId}"]`);
    if (el) {
      document.querySelectorAll(".list-item").forEach(e => e.classList.remove("active"));
      el.classList.add("active");
      el.scrollIntoView({
        block: "nearest"
      });
    }
    renderDetail(novoItem);
  }
}

const REGISTROS_FILHOS = {
  mantenedoras: [ {
    section: "instituicoes",
    fk: "idmantenedora"
  } ],
  instituicoes: [ {
    section: "polos",
    fk: "idinstituicao"
  }, {
    section: "locais",
    fk: "idinstituicao"
  } ],
  polos: [ {
    section: "locais",
    fk: "idpolo"
  } ],
  locais: []
};

function excluirRegistro(section, id) {
  const c = cfg[section];
  const item = (DB[section] || []).find(x => x[c.idKey] === id);
  if (!item) return;
  const nome = item[c.nameKey] || item.nome || item.razao_social || "ID " + id;
  const filhos = (REGISTROS_FILHOS[section] || []).reduce((total, rel) => total + (DB[rel.section] || []).filter(x => x[rel.fk] === id).length, 0);
  const aviso = filhos > 0 ? `\n\n⚠️ Atenção: existem ${filhos} registro(s) vinculados a este (instituições/polos/locais) que ficarão sem referência. Eles NÃO serão excluídos automaticamente.` : "";
  if (!confirm(`Excluir "${nome}"?${aviso}`)) return;
  DB[section] = DB[section].filter(x => x[c.idKey] !== id);
  excluirRegistroInstitucional(section, id);
  renderPainelCats();
  if (section === currentSection) {
    allItems = listaOrdenadaPorId(section);
    renderList(allItems);
    document.getElementById("detail-pane").innerHTML = `\n          <div class="empty-state">\n            <div class="empty-icon"></div>\n            <p>Selecione um item para ver os detalhes</p>\n          </div>`;
  }
}


// Renderiza a lista inicial (Mantenedoras) assim que o HTML da tela
// (telas/painel.html) termina de ser injetado pela primeira vez — veja
// garantirTelaPainel() no script principal, que chama esta função.
function initPainelScreen() {
  setSection("mantenedoras");
}
