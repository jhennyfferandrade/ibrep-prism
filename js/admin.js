/**
 * IBREP Prism — Módulo: Painel do Administrador
 * ---------------------------------------------------
 * Tela própria da área administrativa (antes era um modal — 
 * #users-admin-overlay — que abria por cima do index.html). O login
 * (senha de admin) continua igual, só que agora, depois de logada,
 * a bolinha 🛠️ no canto inferior direito leva pra essa tela cheia,
 * com menu de seções à esquerda, no mesmo padrão de Tutoriais
 * (.tut-cats/.tut-cat-btn).
 *
 * Duas seções (ver ADMIN_SECOES logo abaixo):
 *   1. Usuários — lista nome / login / perfil de cada login. O
 *                 formulário de novo usuário / edição não é mais uma
 *                 aba separada: ele abre e fecha dentro da própria
 *                 seção Usuários (painel oculto por padrão), tanto ao
 *                 clicar em "➕ Novo usuário" quanto em "Editar" numa
 *                 linha da tabela — sem trocar de aba no menu lateral.
 *                 CPF e Senha são sempre opcionais (senha só é
 *                 obrigatória ao criar um usuário novo).
 *   2. Perfis   — cadastro de perfis de permissão reutilizáveis
 *                 (ex.: "Pedagógico" com Tutoriais + Calendário +
 *                 Atos Normativos liberados)
 *
 * IMPORTANTE — contrato esperado das funções RPC no Supabase (ajustar
 * lá se ainda não existirem nesse formato):
 *   listar_perfis(p_admin_senha)
 *     -> { ok, perfis: [{ id, nome, permissoes:{ tutoriais, comparativo,
 *          regras, portarias, cursos, painel, calendario,
 *          calendario_editar, is_admin } }] }
 *   criar_perfil / editar_perfil(p_admin_senha, [p_id,] p_nome,
 *          p_area_tutoriais, p_area_comparativo, p_area_regras,
 *          p_area_portarias, p_area_cursos, p_area_painel,
 *          p_area_calendario, p_calendario_editar, p_is_admin)
 *     -> { ok, id? }
 *   excluir_perfil(p_admin_senha, p_id) -> { ok, erro? }
 *   listar_usuarios(p_admin_senha)
 *     -> { ok, usuarios: [{ id, nome, login, cpf, perfil_id,
 *          perfil_nome }] }
 *   criar_usuario / editar_usuario(p_admin_senha, [p_id,] p_nome,
 *          p_login, p_cpf, p_senha, p_perfil_id)
 *     -> { ok }
 *   excluir_usuario(p_admin_senha, p_id) -> { ok }
 */

// Cada seção precisa de: id, label, icon (emoji) e uma função render()
// que recebe o elemento #admin-content e desenha o conteúdo dela.
const ADMIN_SECOES = [
  { id: "usuarios", label: "Usuários", icon: "👥", render: renderAdminUsuarios },
  { id: "perfis", label: "Perfis", icon: "🗂️", render: renderAdminPerfis }
];

// Campos de permissão compartilhados entre os perfis e a antiga tabela
// de usuários — usados tanto pro form de Perfis quanto pro cabeçalho
// da tabela de Perfis.
const ADMIN_PERM_CAMPOS = [
  { key: "tutoriais", label: "Tutoriais", icon: "🎬" },
  { key: "comparativo", label: "Comparativo", icon: "📊" },
  { key: "regras", label: "Regras", icon: "📖" },
  { key: "portarias", label: "Atos Normativos", icon: "📜" },
  { key: "cursos", label: "Cursos", icon: "🎓" },
  { key: "painel", label: "Painel", icon: "🏛️" },
  { key: "contatos", label: "Quem Procurar", icon: "📇" },
  { key: "calendario", label: "Calendário (ver)", icon: "📅" },
  { key: "calendario_editar", label: "Calendário (editar)", icon: "📅✏️" }
];

let adminSecaoAtual = null;
let usersEditId = null;
let perfilEditId = null;

function initAdminScreen() {
  if (!adminSenha) {
    irParaTela("welcome");
    return;
  }
  renderAdminCats();
  const chave = adminSecaoAtual && ADMIN_SECOES.some(s => s.id === adminSecaoAtual)
    ? adminSecaoAtual
    : ADMIN_SECOES[0]?.id;
  const btn = document.querySelector(`.tut-cat-btn[data-admsec="${chave}"]`);
  if (btn) setAdminCat(btn, chave);
}

function renderAdminCats() {
  const cont = document.getElementById("admin-cats-list");
  if (!cont) return;
  cont.innerHTML = ADMIN_SECOES.map((s, idx) => `
          <button class="tut-cat-btn ${s.id === adminSecaoAtual ? "active" : ""}" data-admsec="${s.id}">
            <span class="tut-cat-icon" data-num="${idx + 1}"></span> ${escapeHtmlRegra(s.label)}
          </button>`).join("");
  cont.querySelectorAll(".tut-cat-btn").forEach(btn => {
    btn.addEventListener("click", () => setAdminCat(btn, btn.getAttribute("data-admsec")));
  });
}

function setAdminCat(btn, secaoId) {
  document.querySelectorAll("#admin-cats-list .tut-cat-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  adminSecaoAtual = secaoId;
  const secao = ADMIN_SECOES.find(s => s.id === secaoId);
  const area = document.getElementById("admin-content");
  if (!secao || !area) return;
  secao.render(area);
}

// -------------------------------------------------------------------------
// Cache de perfis — usado tanto na seção Usuários (mostrar o nome do
// perfil de cada login) quanto na seção Cadastrar usuário (popular o
// <select> de perfis).
// -------------------------------------------------------------------------
let perfisCarregados = false;
window._perfisCache = window._perfisCache || [];

async function garantirPerfisCache(forcar) {
  if (perfisCarregados && !forcar) return window._perfisCache;
  if (!adminSenha) return window._perfisCache;
  try {
    const data = await supabaseRpc("listar_perfis", {
      p_admin_senha: adminSenha
    });
    if (data.ok) {
      window._perfisCache = data.perfis || [];
      perfisCarregados = true;
    }
  } catch (e) {
    console.warn("Não foi possível carregar a lista de perfis.", e);
  }
  return window._perfisCache;
}

function nomePerfilPorId(id) {
  if (!id) return "—";
  const p = (window._perfisCache || []).find(x => x.id === id);
  return p ? p.nome : "—";
}

// -------------------------------------------------------------------------
// Seção: Usuários (nome / login / perfil de cada login)
// -------------------------------------------------------------------------
function renderAdminUsuarios(area) {
  area.innerHTML = `
    <div class="tut-content-title">👥 Usuários</div>
    <div class="tut-content-desc">Cada login e o perfil de permissões vinculado a ele. Para criar um perfil novo antes de vincular, use a seção "Perfis".</div>
    <div class="users-admin-body">
      <div class="users-msg" id="users-admin-msg"></div>
      <table class="users-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Login</th>
            <th>Perfil</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="users-table-body"></tbody>
      </table>
      <button class="admin-dashed-btn" style="margin-top:14px;" onclick="irCadastrarUsuario()">➕ Novo usuário</button>
      <div class="users-form" id="cadastro-form" style="display:none;margin-top:14px;">
        <h4 id="cad-form-title" style="font-size:14px;margin-bottom:12px;">Novo usuário</h4>
        <div class="users-msg" id="cad-admin-msg"></div>
        <div class="users-form-grid">
          <div>
            <label>Nome</label>
            <input type="text" id="cad-nome">
          </div>
          <div>
            <label>Login</label>
            <input type="text" id="cad-login">
          </div>
          <div>
            <label>CPF <span style="font-weight:400;color:var(--texto-muted)">(opcional)</span></label>
            <input type="text" id="cad-cpf" placeholder="Somente números">
          </div>
          <div>
            <label>Senha <span id="cad-senha-hint" style="font-weight:400;color:var(--texto-muted)"></span></label>
            <input type="password" id="cad-senha" placeholder="Obrigatória para novo usuário">
          </div>
          <div>
            <label>Perfil</label>
            <select id="cad-perfil">
              <option value="">Selecione um perfil…</option>
            </select>
          </div>
        </div>
        <div class="users-form-hint" id="cad-sem-perfis" style="display:none;">Nenhum perfil cadastrado ainda — crie um na seção "Perfis" antes de vincular.</div>
        <div class="users-form-actions" style="margin-top:14px;">
          <button class="users-btn-save" onclick="salvarUsuarioForm()">Salvar</button>
          <button class="users-btn-cancel" onclick="limparUsuarioForm()">Limpar</button>
          <button class="users-btn-cancel" onclick="fecharFormularioUsuario()">Cancelar</button>
        </div>
      </div>
    </div>`;
  carregarListaUsuarios();
}

// Abre/fecha o painel de novo usuário / edição sem trocar de aba —
// ele mora dentro da própria seção Usuários.
function abrirFormularioUsuario() {
  const painel = document.getElementById("cadastro-form");
  if (!painel) return;
  painel.style.display = "block";
  painel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function fecharFormularioUsuario() {
  const painel = document.getElementById("cadastro-form");
  if (painel) painel.style.display = "none";
  usersEditId = null;
}

function setUsersMsg(texto, tipo) {
  const el = document.getElementById("users-admin-msg");
  if (!el) return;
  el.textContent = texto || "";
  el.className = "users-msg" + (tipo ? " " + tipo : "");
}

async function carregarListaUsuarios() {
  if (!adminSenha) return;
  setUsersMsg("Carregando…", "");
  try {
    await garantirPerfisCache();
    const data = await supabaseRpc("listar_usuarios", {
      p_admin_senha: adminSenha
    });
    if (!data.ok) {
      setUsersMsg(data.erro || "Erro ao listar.", "erro");
      return;
    }
    setUsersMsg("", "");
    const tbody = document.getElementById("users-table-body");
    if (!tbody) return;
    tbody.innerHTML = (data.usuarios || []).map(u => {
      const perfilNome = u.perfil_nome || nomePerfilPorId(u.perfil_id);
      return `<tr>
            <td>${escapeHtmlRegra(u.nome)}</td>
            <td>${escapeHtmlRegra(u.login)}</td>
            <td>${escapeHtmlRegra(perfilNome)}</td>
            <td class="users-actions">
              <button onclick="editarUsuarioForm('${u.id}')">Editar</button>
              <button onclick="excluirUsuarioConfirm('${u.id}')">Excluir</button>
            </td>
          </tr>`;
    }).join("") || `<tr><td colspan="4" style="text-align:center;color:var(--texto-muted);padding:20px;">Nenhum usuário cadastrado</td></tr>`;
    window._usuariosCache = data.usuarios || [];
  } catch (e) {
    setUsersMsg(e.message || "Erro ao carregar usuários.", "erro");
  }
}

async function irCadastrarUsuario() {
  usersEditId = null;
  await limparUsuarioForm();
  abrirFormularioUsuario();
}

async function editarUsuarioForm(id) {
  const u = (window._usuariosCache || []).find(x => x.id === id);
  if (!u) return;
  usersEditId = id;
  await garantirPerfisCache();
  popularSelectPerfis(document.getElementById("cad-perfil"), u.perfil_id);
  document.getElementById("cad-form-title").textContent = "Editar usuário";
  document.getElementById("cad-senha-hint").textContent = "(deixe em branco para manter)";
  document.getElementById("cad-nome").value = u.nome || "";
  document.getElementById("cad-login").value = u.login || "";
  document.getElementById("cad-cpf").value = u.cpf || "";
  document.getElementById("cad-senha").value = "";
  document.getElementById("cad-senha").placeholder = "Nova senha (opcional)";
  setCadMsg("", "");
  abrirFormularioUsuario();
}

async function excluirUsuarioConfirm(id) {
  if (!adminSenha) return;
  const u = (window._usuariosCache || []).find(x => x.id === id);
  const nome = u ? u.nome : "este usuário";
  if (!confirm(`Excluir o usuário "${nome}"?`)) return;
  setUsersMsg("Excluindo…", "");
  try {
    const data = await supabaseRpc("excluir_usuario", {
      p_admin_senha: adminSenha,
      p_id: id
    });
    if (!data.ok) {
      setUsersMsg(data.erro || "Erro ao excluir.", "erro");
      return;
    }
    setUsersMsg("Usuário excluído.", "ok");
    if (usersEditId === id) usersEditId = null;
    carregarListaUsuarios();
  } catch (e) {
    setUsersMsg(e.message || "Erro ao excluir.", "erro");
  }
}

// -------------------------------------------------------------------------
// Seção: Perfis (permissões reutilizáveis — ex.: Pedagógico,
// Administrativo — vinculadas depois a cada usuário)
// -------------------------------------------------------------------------
function renderAdminPerfis(area) {
  area.innerHTML = `
    <div class="tut-content-title">🗂️ Perfis</div>
    <div class="tut-content-desc">Crie um perfil (ex.: "Pedagógico"), marque o que ele libera e salve. Depois é só vincular esse perfil a cada pessoa na seção "Usuários" ou "Cadastrar usuário".</div>
    <div class="users-admin-body">
      <div class="users-msg" id="perfis-admin-msg"></div>
      <table class="users-table">
        <thead>
          <tr>
            <th>Perfil</th>
            ${ADMIN_PERM_CAMPOS.map(c => `<th class="users-perm-check">${c.icon}</th>`).join("")}
            <th class="users-perm-check">Admin</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="perfis-table-body"></tbody>
      </table>
      <div class="users-form" id="perfil-form">
        <h4 id="perfil-form-title" style="font-size:14px;margin-bottom:12px;">Novo perfil</h4>
        <div class="users-form-grid" style="grid-template-columns:1fr;">
          <div>
            <label>Nome do perfil</label>
            <input type="text" id="perfil-form-nome" placeholder="Ex.: Pedagógico">
          </div>
        </div>
        <div class="users-perms-row">
          ${ADMIN_PERM_CAMPOS.map(c => `<label><input type="checkbox" id="perfil-perm-${c.key}"> ${escapeHtmlRegra(c.label)}</label>`).join("\n          ")}
          <label><input type="checkbox" id="perfil-perm-is-admin"> Administradora</label>
        </div>
        <div class="users-form-actions">
          <button class="users-btn-save" onclick="salvarPerfilForm()">Salvar</button>
          <button class="users-btn-cancel" onclick="limparPerfilForm()">Limpar</button>
        </div>
      </div>
    </div>`;
  limparPerfilForm();
  carregarListaPerfis();
}

function setPerfisMsg(texto, tipo) {
  const el = document.getElementById("perfis-admin-msg");
  if (!el) return;
  el.textContent = texto || "";
  el.className = "users-msg" + (tipo ? " " + tipo : "");
}

function permIcon(val) {
  return val ? "✅" : "—";
}

async function carregarListaPerfis() {
  if (!adminSenha) return;
  setPerfisMsg("Carregando…", "");
  try {
    const perfis = await garantirPerfisCache(true);
    setPerfisMsg("", "");
    const tbody = document.getElementById("perfis-table-body");
    if (!tbody) return;
    tbody.innerHTML = (perfis || []).map(p => {
      const perm = p.permissoes || {};
      return `<tr>
            <td>${escapeHtmlRegra(p.nome)}</td>
            ${ADMIN_PERM_CAMPOS.map(c => `<td class="users-perm-check">${permIcon(perm[c.key])}</td>`).join("")}
            <td class="users-perm-check">${perm.is_admin ? "✅" : "—"}</td>
            <td class="users-actions">
              <button onclick="editarPerfilForm('${p.id}')">Editar</button>
              <button onclick="excluirPerfilConfirm('${p.id}')">Excluir</button>
            </td>
          </tr>`;
    }).join("") || `<tr><td colspan="${ADMIN_PERM_CAMPOS.length + 3}" style="text-align:center;color:var(--texto-muted);padding:20px;">Nenhum perfil cadastrado</td></tr>`;
  } catch (e) {
    setPerfisMsg(e.message || "Erro ao carregar perfis.", "erro");
  }
}

function lerPermissoesPerfilForm() {
  return {
    p_area_tutoriais: document.getElementById("perfil-perm-tutoriais").checked,
    p_area_comparativo: document.getElementById("perfil-perm-comparativo").checked,
    p_area_regras: document.getElementById("perfil-perm-regras").checked,
    p_area_portarias: document.getElementById("perfil-perm-portarias").checked,
    p_area_cursos: document.getElementById("perfil-perm-cursos").checked,
    p_area_painel: document.getElementById("perfil-perm-painel").checked,
    p_area_contatos: document.getElementById("perfil-perm-contatos").checked,
    p_area_calendario: document.getElementById("perfil-perm-calendario").checked,
    p_calendario_editar: document.getElementById("perfil-perm-calendario_editar").checked,
    p_is_admin: document.getElementById("perfil-perm-is-admin").checked
  };
}

function limparPerfilForm() {
  perfilEditId = null;
  const titulo = document.getElementById("perfil-form-title");
  if (!titulo) return;
  titulo.textContent = "Novo perfil";
  document.getElementById("perfil-form-nome").value = "";
  ADMIN_PERM_CAMPOS.forEach(c => {
    document.getElementById(`perfil-perm-${c.key}`).checked = false;
  });
  document.getElementById("perfil-perm-is-admin").checked = false;
}

function editarPerfilForm(id) {
  const p = (window._perfisCache || []).find(x => x.id === id);
  if (!p) return;
  perfilEditId = id;
  document.getElementById("perfil-form-title").textContent = "Editar perfil";
  document.getElementById("perfil-form-nome").value = p.nome;
  const perm = p.permissoes || {};
  ADMIN_PERM_CAMPOS.forEach(c => {
    document.getElementById(`perfil-perm-${c.key}`).checked = !!perm[c.key];
  });
  document.getElementById("perfil-perm-is-admin").checked = !!perm.is_admin;
  document.getElementById("perfil-form").scrollIntoView({
    behavior: "smooth"
  });
}

async function salvarPerfilForm() {
  if (!adminSenha) return;
  const nome = document.getElementById("perfil-form-nome").value.trim();
  if (!nome) {
    setPerfisMsg("Dê um nome para o perfil.", "erro");
    return;
  }
  const perms = lerPermissoesPerfilForm();
  setPerfisMsg("Salvando…", "");
  try {
    let data;
    if (perfilEditId) {
      data = await supabaseRpc("editar_perfil", {
        p_admin_senha: adminSenha,
        p_id: perfilEditId,
        p_nome: nome,
        ...perms
      });
    } else {
      data = await supabaseRpc("criar_perfil", {
        p_admin_senha: adminSenha,
        p_nome: nome,
        ...perms
      });
    }
    if (!data.ok) {
      setPerfisMsg(data.erro || "Erro ao salvar.", "erro");
      return;
    }
    setPerfisMsg(perfilEditId ? "Perfil atualizado!" : "Perfil criado!", "ok");
    limparPerfilForm();
    carregarListaPerfis();
  } catch (e) {
    setPerfisMsg(e.message || "Erro ao salvar.", "erro");
  }
}

async function excluirPerfilConfirm(id) {
  if (!adminSenha) return;
  const p = (window._perfisCache || []).find(x => x.id === id);
  const nome = p ? p.nome : "este perfil";
  if (!confirm(`Excluir o perfil "${nome}"? Usuários vinculados a ele ficam sem perfil.`)) return;
  setPerfisMsg("Excluindo…", "");
  try {
    const data = await supabaseRpc("excluir_perfil", {
      p_admin_senha: adminSenha,
      p_id: id
    });
    if (!data.ok) {
      setPerfisMsg(data.erro || "Erro ao excluir.", "erro");
      return;
    }
    setPerfisMsg("Perfil excluído.", "ok");
    if (perfilEditId === id) limparPerfilForm();
    carregarListaPerfis();
  } catch (e) {
    setPerfisMsg(e.message || "Erro ao excluir.", "erro");
  }
}

// -------------------------------------------------------------------------
// Formulário de usuário (novo / edição) — painel dentro da própria seção
// Usuários (ver #cadastro-form em renderAdminUsuarios, e abrirFormularioUsuario
// / fecharFormularioUsuario logo abaixo dela). Nome, login, CPF (opcional),
// senha (opcional ao editar) e o perfil vinculado.
// -------------------------------------------------------------------------
function setCadMsg(texto, tipo) {
  const el = document.getElementById("cad-admin-msg");
  if (!el) return;
  el.textContent = texto || "";
  el.className = "users-msg" + (tipo ? " " + tipo : "");
}

function popularSelectPerfis(selectEl, selecionadoId) {
  if (!selectEl) return;
  const perfis = window._perfisCache || [];
  selectEl.innerHTML = `<option value="">Selecione um perfil…</option>` +
    perfis.map(p => `<option value="${p.id}" ${p.id === selecionadoId ? "selected" : ""}>${escapeHtmlRegra(p.nome)}</option>`).join("");
  const semPerfis = document.getElementById("cad-sem-perfis");
  if (semPerfis) semPerfis.style.display = perfis.length ? "none" : "block";
}

async function limparUsuarioForm() {
  usersEditId = null;
  const titulo = document.getElementById("cad-form-title");
  if (!titulo) return;
  titulo.textContent = "Novo usuário";
  document.getElementById("cad-senha-hint").textContent = "";
  document.getElementById("cad-nome").value = "";
  document.getElementById("cad-login").value = "";
  document.getElementById("cad-cpf").value = "";
  document.getElementById("cad-senha").value = "";
  document.getElementById("cad-senha").placeholder = "Obrigatória para novo usuário";
  setCadMsg("", "");
  await garantirPerfisCache();
  popularSelectPerfis(document.getElementById("cad-perfil"), null);
}

async function salvarUsuarioForm() {
  if (!adminSenha) return;
  const nome = document.getElementById("cad-nome").value.trim();
  const login = document.getElementById("cad-login").value.trim();
  const cpf = document.getElementById("cad-cpf").value.trim();
  const senha = document.getElementById("cad-senha").value;
  const perfilId = document.getElementById("cad-perfil").value || null;
  if (!nome || !login) {
    setCadMsg("Nome e login são obrigatórios.", "erro");
    return;
  }
  if (!perfilId) {
    setCadMsg("Selecione um perfil.", "erro");
    return;
  }
  if (!usersEditId && !senha) {
    setCadMsg("Senha é obrigatória para novo usuário.", "erro");
    return;
  }
  setCadMsg("Salvando…", "");
  try {
    let data;
    if (usersEditId) {
      data = await supabaseRpc("editar_usuario", {
        p_admin_senha: adminSenha,
        p_id: usersEditId,
        p_nome: nome,
        p_login: login,
        p_cpf: cpf || null,
        p_senha: senha || null,
        p_perfil_id: perfilId
      });
    } else {
      data = await supabaseRpc("criar_usuario", {
        p_admin_senha: adminSenha,
        p_nome: nome,
        p_login: login,
        p_cpf: cpf || null,
        p_senha: senha,
        p_perfil_id: perfilId
      });
    }
    if (!data.ok) {
      setCadMsg(data.erro || "Erro ao salvar.", "erro");
      return;
    }
    setCadMsg(usersEditId ? "Usuário atualizado!" : "Usuário criado!", "ok");
    fecharFormularioUsuario();
    carregarListaUsuarios();
  } catch (e) {
    setCadMsg(e.message || "Erro ao salvar.", "erro");
  }
}/**
 * IBREP Prism — Módulo: Painel do Administrador
 * ---------------------------------------------------
 * Tela própria da área administrativa (antes era um modal — 
 * #users-admin-overlay — que abria por cima do index.html). O login
 * (senha de admin) continua igual, só que agora, depois de logada,
 * a bolinha 🛠️ no canto inferior direito leva pra essa tela cheia,
 * com menu de seções à esquerda, no mesmo padrão de Tutoriais
 * (.tut-cats/.tut-cat-btn).
 *
 * Duas seções (ver ADMIN_SECOES logo abaixo):
 *   1. Usuários — lista nome / login / perfil de cada login. O
 *                 formulário de novo usuário / edição não é mais uma
 *                 aba separada: ele abre e fecha dentro da própria
 *                 seção Usuários (painel oculto por padrão), tanto ao
 *                 clicar em "➕ Novo usuário" quanto em "Editar" numa
 *                 linha da tabela — sem trocar de aba no menu lateral.
 *                 CPF e Senha são sempre opcionais (senha só é
 *                 obrigatória ao criar um usuário novo).
 *   2. Perfis   — cadastro de perfis de permissão reutilizáveis
 *                 (ex.: "Pedagógico" com Tutoriais + Calendário +
 *                 Atos Normativos liberados)
 *
 * IMPORTANTE — contrato esperado das funções RPC no Supabase (ajustar
 * lá se ainda não existirem nesse formato):
 *   listar_perfis(p_admin_senha)
 *     -> { ok, perfis: [{ id, nome, permissoes:{ tutoriais, comparativo,
 *          regras, portarias, cursos, painel, calendario,
 *          calendario_editar, is_admin } }] }
 *   criar_perfil / editar_perfil(p_admin_senha, [p_id,] p_nome,
 *          p_area_tutoriais, p_area_comparativo, p_area_regras,
 *          p_area_portarias, p_area_cursos, p_area_painel,
 *          p_area_calendario, p_calendario_editar, p_is_admin)
 *     -> { ok, id? }
 *   excluir_perfil(p_admin_senha, p_id) -> { ok, erro? }
 *   listar_usuarios(p_admin_senha)
 *     -> { ok, usuarios: [{ id, nome, login, cpf, perfil_id,
 *          perfil_nome }] }
 *   criar_usuario / editar_usuario(p_admin_senha, [p_id,] p_nome,
 *          p_login, p_cpf, p_senha, p_perfil_id)
 *     -> { ok }
 *   excluir_usuario(p_admin_senha, p_id) -> { ok }
 */

// Cada seção precisa de: id, label, icon (emoji) e uma função render()
// que recebe o elemento #admin-content e desenha o conteúdo dela.
const ADMIN_SECOES = [
  { id: "usuarios", label: "Usuários", icon: "👥", render: renderAdminUsuarios },
  { id: "perfis", label: "Perfis", icon: "🗂️", render: renderAdminPerfis }
];

// Campos de permissão compartilhados entre os perfis e a antiga tabela
// de usuários — usados tanto pro form de Perfis quanto pro cabeçalho
// da tabela de Perfis.
const ADMIN_PERM_CAMPOS = [
  { key: "tutoriais", label: "Tutoriais", icon: "🎬" },
  { key: "comparativo", label: "Comparativo", icon: "📊" },
  { key: "regras", label: "Regras", icon: "📖" },
  { key: "portarias", label: "Atos Normativos", icon: "📜" },
  { key: "cursos", label: "Cursos", icon: "🎓" },
  { key: "painel", label: "Painel", icon: "🏛️" },
  { key: "contatos", label: "Quem Procurar", icon: "📇" },
  { key: "calendario", label: "Calendário (ver)", icon: "📅" },
  { key: "calendario_editar", label: "Calendário (editar)", icon: "📅✏️" }
];

let adminSecaoAtual = null;
let usersEditId = null;
let perfilEditId = null;

function initAdminScreen() {
  if (!adminSenha) {
    irParaTela("welcome");
    return;
  }
  renderAdminCats();
  const chave = adminSecaoAtual && ADMIN_SECOES.some(s => s.id === adminSecaoAtual)
    ? adminSecaoAtual
    : ADMIN_SECOES[0]?.id;
  const btn = document.querySelector(`.tut-cat-btn[data-admsec="${chave}"]`);
  if (btn) setAdminCat(btn, chave);
}

function renderAdminCats() {
  const cont = document.getElementById("admin-cats-list");
  if (!cont) return;
  cont.innerHTML = ADMIN_SECOES.map((s, idx) => `
          <button class="tut-cat-btn ${s.id === adminSecaoAtual ? "active" : ""}" data-admsec="${s.id}">
            <span class="tut-cat-icon" data-num="${idx + 1}"></span> ${escapeHtmlRegra(s.label)}
          </button>`).join("");
  cont.querySelectorAll(".tut-cat-btn").forEach(btn => {
    btn.addEventListener("click", () => setAdminCat(btn, btn.getAttribute("data-admsec")));
  });
}

function setAdminCat(btn, secaoId) {
  document.querySelectorAll("#admin-cats-list .tut-cat-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  adminSecaoAtual = secaoId;
  const secao = ADMIN_SECOES.find(s => s.id === secaoId);
  const area = document.getElementById("admin-content");
  if (!secao || !area) return;
  secao.render(area);
}

// -------------------------------------------------------------------------
// Cache de perfis — usado tanto na seção Usuários (mostrar o nome do
// perfil de cada login) quanto na seção Cadastrar usuário (popular o
// <select> de perfis).
// -------------------------------------------------------------------------
let perfisCarregados = false;
window._perfisCache = window._perfisCache || [];

async function garantirPerfisCache(forcar) {
  if (perfisCarregados && !forcar) return window._perfisCache;
  if (!adminSenha) return window._perfisCache;
  try {
    const data = await supabaseRpc("listar_perfis", {
      p_admin_senha: adminSenha
    });
    if (data.ok) {
      window._perfisCache = data.perfis || [];
      perfisCarregados = true;
    }
  } catch (e) {
    console.warn("Não foi possível carregar a lista de perfis.", e);
  }
  return window._perfisCache;
}

function nomePerfilPorId(id) {
  if (!id) return "—";
  const p = (window._perfisCache || []).find(x => x.id === id);
  return p ? p.nome : "—";
}

// -------------------------------------------------------------------------
// Seção: Usuários (nome / login / perfil de cada login)
// -------------------------------------------------------------------------
function renderAdminUsuarios(area) {
  area.innerHTML = `
    <div class="tut-content-title">👥 Usuários</div>
    <div class="tut-content-desc">Cada login e o perfil de permissões vinculado a ele. Para criar um perfil novo antes de vincular, use a seção "Perfis".</div>
    <div class="users-admin-body">
      <div class="users-msg" id="users-admin-msg"></div>
      <table class="users-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Login</th>
            <th>Perfil</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="users-table-body"></tbody>
      </table>
      <button class="admin-dashed-btn" style="margin-top:14px;" onclick="irCadastrarUsuario()">➕ Novo usuário</button>
      <div class="users-form" id="cadastro-form" style="display:none;margin-top:14px;">
        <h4 id="cad-form-title" style="font-size:14px;margin-bottom:12px;">Novo usuário</h4>
        <div class="users-msg" id="cad-admin-msg"></div>
        <div class="users-form-grid">
          <div>
            <label>Nome</label>
            <input type="text" id="cad-nome">
          </div>
          <div>
            <label>Login</label>
            <input type="text" id="cad-login">
          </div>
          <div>
            <label>CPF <span style="font-weight:400;color:var(--texto-muted)">(opcional)</span></label>
            <input type="text" id="cad-cpf" placeholder="Somente números">
          </div>
          <div>
            <label>Senha <span id="cad-senha-hint" style="font-weight:400;color:var(--texto-muted)"></span></label>
            <input type="password" id="cad-senha" placeholder="Obrigatória para novo usuário">
          </div>
          <div>
            <label>Perfil</label>
            <select id="cad-perfil">
              <option value="">Selecione um perfil…</option>
            </select>
          </div>
        </div>
        <div class="users-form-hint" id="cad-sem-perfis" style="display:none;">Nenhum perfil cadastrado ainda — crie um na seção "Perfis" antes de vincular.</div>
        <div class="users-form-actions" style="margin-top:14px;">
          <button class="users-btn-save" onclick="salvarUsuarioForm()">Salvar</button>
          <button class="users-btn-cancel" onclick="limparUsuarioForm()">Limpar</button>
          <button class="users-btn-cancel" onclick="fecharFormularioUsuario()">Cancelar</button>
        </div>
      </div>
    </div>`;
  carregarListaUsuarios();
}

// Abre/fecha o painel de novo usuário / edição sem trocar de aba —
// ele mora dentro da própria seção Usuários.
function abrirFormularioUsuario() {
  const painel = document.getElementById("cadastro-form");
  if (!painel) return;
  painel.style.display = "block";
  painel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function fecharFormularioUsuario() {
  const painel = document.getElementById("cadastro-form");
  if (painel) painel.style.display = "none";
  usersEditId = null;
}

function setUsersMsg(texto, tipo) {
  const el = document.getElementById("users-admin-msg");
  if (!el) return;
  el.textContent = texto || "";
  el.className = "users-msg" + (tipo ? " " + tipo : "");
}

async function carregarListaUsuarios() {
  if (!adminSenha) return;
  setUsersMsg("Carregando…", "");
  try {
    await garantirPerfisCache();
    const data = await supabaseRpc("listar_usuarios", {
      p_admin_senha: adminSenha
    });
    if (!data.ok) {
      setUsersMsg(data.erro || "Erro ao listar.", "erro");
      return;
    }
    setUsersMsg("", "");
    const tbody = document.getElementById("users-table-body");
    if (!tbody) return;
    tbody.innerHTML = (data.usuarios || []).map(u => {
      const perfilNome = u.perfil_nome || nomePerfilPorId(u.perfil_id);
      return `<tr>
            <td>${escapeHtmlRegra(u.nome)}</td>
            <td>${escapeHtmlRegra(u.login)}</td>
            <td>${escapeHtmlRegra(perfilNome)}</td>
            <td class="users-actions">
              <button onclick="editarUsuarioForm('${u.id}')">Editar</button>
              <button onclick="excluirUsuarioConfirm('${u.id}')">Excluir</button>
            </td>
          </tr>`;
    }).join("") || `<tr><td colspan="4" style="text-align:center;color:var(--texto-muted);padding:20px;">Nenhum usuário cadastrado</td></tr>`;
    window._usuariosCache = data.usuarios || [];
  } catch (e) {
    setUsersMsg(e.message || "Erro ao carregar usuários.", "erro");
  }
}

async function irCadastrarUsuario() {
  usersEditId = null;
  await limparUsuarioForm();
  abrirFormularioUsuario();
}

async function editarUsuarioForm(id) {
  const u = (window._usuariosCache || []).find(x => x.id === id);
  if (!u) return;
  usersEditId = id;
  await garantirPerfisCache();
  popularSelectPerfis(document.getElementById("cad-perfil"), u.perfil_id);
  document.getElementById("cad-form-title").textContent = "Editar usuário";
  document.getElementById("cad-senha-hint").textContent = "(deixe em branco para manter)";
  document.getElementById("cad-nome").value = u.nome || "";
  document.getElementById("cad-login").value = u.login || "";
  document.getElementById("cad-cpf").value = u.cpf || "";
  document.getElementById("cad-senha").value = "";
  document.getElementById("cad-senha").placeholder = "Nova senha (opcional)";
  setCadMsg("", "");
  abrirFormularioUsuario();
}

async function excluirUsuarioConfirm(id) {
  if (!adminSenha) return;
  const u = (window._usuariosCache || []).find(x => x.id === id);
  const nome = u ? u.nome : "este usuário";
  if (!confirm(`Excluir o usuário "${nome}"?`)) return;
  setUsersMsg("Excluindo…", "");
  try {
    const data = await supabaseRpc("excluir_usuario", {
      p_admin_senha: adminSenha,
      p_id: id
    });
    if (!data.ok) {
      setUsersMsg(data.erro || "Erro ao excluir.", "erro");
      return;
    }
    setUsersMsg("Usuário excluído.", "ok");
    if (usersEditId === id) usersEditId = null;
    carregarListaUsuarios();
  } catch (e) {
    setUsersMsg(e.message || "Erro ao excluir.", "erro");
  }
}

// -------------------------------------------------------------------------
// Seção: Perfis (permissões reutilizáveis — ex.: Pedagógico,
// Administrativo — vinculadas depois a cada usuário)
// -------------------------------------------------------------------------
function renderAdminPerfis(area) {
  area.innerHTML = `
    <div class="tut-content-title">🗂️ Perfis</div>
    <div class="tut-content-desc">Crie um perfil (ex.: "Pedagógico"), marque o que ele libera e salve. Depois é só vincular esse perfil a cada pessoa na seção "Usuários" ou "Cadastrar usuário".</div>
    <div class="users-admin-body">
      <div class="users-msg" id="perfis-admin-msg"></div>
      <table class="users-table">
        <thead>
          <tr>
            <th>Perfil</th>
            ${ADMIN_PERM_CAMPOS.map(c => `<th class="users-perm-check">${c.icon}</th>`).join("")}
            <th class="users-perm-check">Admin</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="perfis-table-body"></tbody>
      </table>
      <div class="users-form" id="perfil-form">
        <h4 id="perfil-form-title" style="font-size:14px;margin-bottom:12px;">Novo perfil</h4>
        <div class="users-form-grid" style="grid-template-columns:1fr;">
          <div>
            <label>Nome do perfil</label>
            <input type="text" id="perfil-form-nome" placeholder="Ex.: Pedagógico">
          </div>
        </div>
        <div class="users-perms-row">
          ${ADMIN_PERM_CAMPOS.map(c => `<label><input type="checkbox" id="perfil-perm-${c.key}"> ${escapeHtmlRegra(c.label)}</label>`).join("\n          ")}
          <label><input type="checkbox" id="perfil-perm-is-admin"> Administradora</label>
        </div>
        <div class="users-form-actions">
          <button class="users-btn-save" onclick="salvarPerfilForm()">Salvar</button>
          <button class="users-btn-cancel" onclick="limparPerfilForm()">Limpar</button>
        </div>
      </div>
    </div>`;
  limparPerfilForm();
  carregarListaPerfis();
}

function setPerfisMsg(texto, tipo) {
  const el = document.getElementById("perfis-admin-msg");
  if (!el) return;
  el.textContent = texto || "";
  el.className = "users-msg" + (tipo ? " " + tipo : "");
}

function permIcon(val) {
  return val ? "✅" : "—";
}

async function carregarListaPerfis() {
  if (!adminSenha) return;
  setPerfisMsg("Carregando…", "");
  try {
    const perfis = await garantirPerfisCache(true);
    setPerfisMsg("", "");
    const tbody = document.getElementById("perfis-table-body");
    if (!tbody) return;
    tbody.innerHTML = (perfis || []).map(p => {
      const perm = p.permissoes || {};
      return `<tr>
            <td>${escapeHtmlRegra(p.nome)}</td>
            ${ADMIN_PERM_CAMPOS.map(c => `<td class="users-perm-check">${permIcon(perm[c.key])}</td>`).join("")}
            <td class="users-perm-check">${perm.is_admin ? "✅" : "—"}</td>
            <td class="users-actions">
              <button onclick="editarPerfilForm('${p.id}')">Editar</button>
              <button onclick="excluirPerfilConfirm('${p.id}')">Excluir</button>
            </td>
          </tr>`;
    }).join("") || `<tr><td colspan="${ADMIN_PERM_CAMPOS.length + 3}" style="text-align:center;color:var(--texto-muted);padding:20px;">Nenhum perfil cadastrado</td></tr>`;
  } catch (e) {
    setPerfisMsg(e.message || "Erro ao carregar perfis.", "erro");
  }
}

function lerPermissoesPerfilForm() {
  return {
    p_area_tutoriais: document.getElementById("perfil-perm-tutoriais").checked,
    p_area_comparativo: document.getElementById("perfil-perm-comparativo").checked,
    p_area_regras: document.getElementById("perfil-perm-regras").checked,
    p_area_portarias: document.getElementById("perfil-perm-portarias").checked,
    p_area_cursos: document.getElementById("perfil-perm-cursos").checked,
    p_area_painel: document.getElementById("perfil-perm-painel").checked,
    p_area_contatos: document.getElementById("perfil-perm-contatos").checked,
    p_area_calendario: document.getElementById("perfil-perm-calendario").checked,
    p_calendario_editar: document.getElementById("perfil-perm-calendario_editar").checked,
    p_is_admin: document.getElementById("perfil-perm-is-admin").checked
  };
}

function limparPerfilForm() {
  perfilEditId = null;
  const titulo = document.getElementById("perfil-form-title");
  if (!titulo) return;
  titulo.textContent = "Novo perfil";
  document.getElementById("perfil-form-nome").value = "";
  ADMIN_PERM_CAMPOS.forEach(c => {
    document.getElementById(`perfil-perm-${c.key}`).checked = false;
  });
  document.getElementById("perfil-perm-is-admin").checked = false;
}

function editarPerfilForm(id) {
  const p = (window._perfisCache || []).find(x => x.id === id);
  if (!p) return;
  perfilEditId = id;
  document.getElementById("perfil-form-title").textContent = "Editar perfil";
  document.getElementById("perfil-form-nome").value = p.nome;
  const perm = p.permissoes || {};
  ADMIN_PERM_CAMPOS.forEach(c => {
    document.getElementById(`perfil-perm-${c.key}`).checked = !!perm[c.key];
  });
  document.getElementById("perfil-perm-is-admin").checked = !!perm.is_admin;
  document.getElementById("perfil-form").scrollIntoView({
    behavior: "smooth"
  });
}

async function salvarPerfilForm() {
  if (!adminSenha) return;
  const nome = document.getElementById("perfil-form-nome").value.trim();
  if (!nome) {
    setPerfisMsg("Dê um nome para o perfil.", "erro");
    return;
  }
  const perms = lerPermissoesPerfilForm();
  setPerfisMsg("Salvando…", "");
  try {
    let data;
    if (perfilEditId) {
      data = await supabaseRpc("editar_perfil", {
        p_admin_senha: adminSenha,
        p_id: perfilEditId,
        p_nome: nome,
        ...perms
      });
    } else {
      data = await supabaseRpc("criar_perfil", {
        p_admin_senha: adminSenha,
        p_nome: nome,
        ...perms
      });
    }
    if (!data.ok) {
      setPerfisMsg(data.erro || "Erro ao salvar.", "erro");
      return;
    }
    setPerfisMsg(perfilEditId ? "Perfil atualizado!" : "Perfil criado!", "ok");
    limparPerfilForm();
    carregarListaPerfis();
  } catch (e) {
    setPerfisMsg(e.message || "Erro ao salvar.", "erro");
  }
}

async function excluirPerfilConfirm(id) {
  if (!adminSenha) return;
  const p = (window._perfisCache || []).find(x => x.id === id);
  const nome = p ? p.nome : "este perfil";
  if (!confirm(`Excluir o perfil "${nome}"? Usuários vinculados a ele ficam sem perfil.`)) return;
  setPerfisMsg("Excluindo…", "");
  try {
    const data = await supabaseRpc("excluir_perfil", {
      p_admin_senha: adminSenha,
      p_id: id
    });
    if (!data.ok) {
      setPerfisMsg(data.erro || "Erro ao excluir.", "erro");
      return;
    }
    setPerfisMsg("Perfil excluído.", "ok");
    if (perfilEditId === id) limparPerfilForm();
    carregarListaPerfis();
  } catch (e) {
    setPerfisMsg(e.message || "Erro ao excluir.", "erro");
  }
}

// -------------------------------------------------------------------------
// Formulário de usuário (novo / edição) — painel dentro da própria seção
// Usuários (ver #cadastro-form em renderAdminUsuarios, e abrirFormularioUsuario
// / fecharFormularioUsuario logo abaixo dela). Nome, login, CPF (opcional),
// senha (opcional ao editar) e o perfil vinculado.
// -------------------------------------------------------------------------
function setCadMsg(texto, tipo) {
  const el = document.getElementById("cad-admin-msg");
  if (!el) return;
  el.textContent = texto || "";
  el.className = "users-msg" + (tipo ? " " + tipo : "");
}

function popularSelectPerfis(selectEl, selecionadoId) {
  if (!selectEl) return;
  const perfis = window._perfisCache || [];
  selectEl.innerHTML = `<option value="">Selecione um perfil…</option>` +
    perfis.map(p => `<option value="${p.id}" ${p.id === selecionadoId ? "selected" : ""}>${escapeHtmlRegra(p.nome)}</option>`).join("");
  const semPerfis = document.getElementById("cad-sem-perfis");
  if (semPerfis) semPerfis.style.display = perfis.length ? "none" : "block";
}

async function limparUsuarioForm() {
  usersEditId = null;
  const titulo = document.getElementById("cad-form-title");
  if (!titulo) return;
  titulo.textContent = "Novo usuário";
  document.getElementById("cad-senha-hint").textContent = "";
  document.getElementById("cad-nome").value = "";
  document.getElementById("cad-login").value = "";
  document.getElementById("cad-cpf").value = "";
  document.getElementById("cad-senha").value = "";
  document.getElementById("cad-senha").placeholder = "Obrigatória para novo usuário";
  setCadMsg("", "");
  await garantirPerfisCache();
  popularSelectPerfis(document.getElementById("cad-perfil"), null);
}

async function salvarUsuarioForm() {
  if (!adminSenha) return;
  const nome = document.getElementById("cad-nome").value.trim();
  const login = document.getElementById("cad-login").value.trim();
  const cpf = document.getElementById("cad-cpf").value.trim();
  const senha = document.getElementById("cad-senha").value;
  const perfilId = document.getElementById("cad-perfil").value || null;
  if (!nome || !login) {
    setCadMsg("Nome e login são obrigatórios.", "erro");
    return;
  }
  if (!perfilId) {
    setCadMsg("Selecione um perfil.", "erro");
    return;
  }
  if (!usersEditId && !senha) {
    setCadMsg("Senha é obrigatória para novo usuário.", "erro");
    return;
  }
  setCadMsg("Salvando…", "");
  try {
    let data;
    if (usersEditId) {
      data = await supabaseRpc("editar_usuario", {
        p_admin_senha: adminSenha,
        p_id: usersEditId,
        p_nome: nome,
        p_login: login,
        p_cpf: cpf || null,
        p_senha: senha || null,
        p_perfil_id: perfilId
      });
    } else {
      data = await supabaseRpc("criar_usuario", {
        p_admin_senha: adminSenha,
        p_nome: nome,
        p_login: login,
        p_cpf: cpf || null,
        p_senha: senha,
        p_perfil_id: perfilId
      });
    }
    if (!data.ok) {
      setCadMsg(data.erro || "Erro ao salvar.", "erro");
      return;
    }
    setCadMsg(usersEditId ? "Usuário atualizado!" : "Usuário criado!", "ok");
    fecharFormularioUsuario();
    carregarListaUsuarios();
  } catch (e) {
    setCadMsg(e.message || "Erro ao salvar.", "erro");
  }
}
