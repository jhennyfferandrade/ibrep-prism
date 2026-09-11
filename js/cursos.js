/**
 * IBREP Prism — Módulo: Cursos por Instituição
 * -----------------------------------------------------
 * Tudo que é específico da tela "Cursos por Instituição" (estados,
 * instituições, cursos, currículos, disciplinas, AVAs, certificados,
 * provas impressas e atividade presencial) mora aqui.
 *
 * Carregado de forma "eager" (normal <script src>) no index.html, porque
 * `aplicarDadosSalvos()` já espera encontrar `DISCIPLINAS`, `AVAS`,
 * `CURRICULOS`, `CERTIFICADOS`, `PROVAS_IMPRESSAS`, `ATIVIDADE_PRESENCIAL`,
 * `CURSOS_ESTADO_REAL` e `INSTITUICAO_CURSOS`/`CURSOS_CATALOGO` prontos
 * assim que a página carrega. O HTML da tela (telas/cursos.html) é que é
 * carregado sob demanda, só quando o usuário clica no botão.
 */

function openCursos() {
  if (!exigirPermissao("cursos")) return;
  irParaTela("cursos");
}

let cursosEstadoAtual = null;

let cursosEstadosList = [];

const CURSOS_UF_LABEL = {};

function cursosUfLabel(uf) {
  return CURSOS_UF_LABEL[uf] || uf || "";
}

const CURSOS_ESTADO_REAL = {};

function cursosEstadoReal(inst) {
  return CURSOS_ESTADO_REAL[inst.idinstituicao] || inst.estado;
}

const CURSOS_ESTADOS_MANUAL = [];

// 🆕 Monta a lista completa (labels + manuais) pra mandar pro RPC
// salvar_cursos_estados, que substitui tudo a cada chamada.
function montarListaCursosEstados() {
  const nomes = new Set([...Object.keys(CURSOS_UF_LABEL), ...CURSOS_ESTADOS_MANUAL]);
  return Array.from(nomes).map(nome => ({
    nome,
    label: CURSOS_UF_LABEL[nome] || null,
    manual: CURSOS_ESTADOS_MANUAL.includes(nome)
  }));
}

// 🆕 Substitui CURSOS_LIVRES + TTI_PLUS_INST + TTI_360_INST + CURSOS_EXCLUIDOS_POR_INST.
// Estrutura: { "<idinstituicao>": [idcurso, idcurso, ...] }
const INSTITUICAO_CURSOS = {};

// 🆕 Catálogo completo de cursos (id -> nome), vindo da tabela "cursos".
const CURSOS_CATALOGO = {};

// Chama uma função RPC "de admin" (padrão p_admin_senha + { ok, erro }) e
// devolve true (sucesso) | false (tentou e falhou) | null (sem sessão de admin).
async function chamarRpcAdmin(fn, params) {
  if (!adminSenha) return null;
  try {
    const data = await supabaseRpc(fn, params);
    if (!data.ok) {
      console.error(`Supabase: falha ao chamar ${fn}. ${data.erro || ""}`);
      return false;
    }
    console.log(`Supabase: ${fn} executado com sucesso.`);
    return true;
  } catch (e) {
    console.warn(`Supabase: não foi possível chamar ${fn}.`, e);
    return false;
  }
}

async function excluirCursoDeInstituicao(idinstituicao, idCurso, nomeCurso) {
  if (!adminMode) return;
  if (!confirm(`Remover o curso "${nomeCurso}" desta instituição?\n\n(Isso desassocia o curso desta instituição. Dá pra readicionar depois em "+ Adicionar curso".)`)) return;
  const resultado = await chamarRpcAdmin("remover_curso_instituicao", {
    p_admin_senha: adminSenha,
    p_idinstituicao: idinstituicao,
    p_idcurso: idCurso
  });
  avisarFalhaSalvarNuvem(resultado);
  if (resultado !== false) {
    const chave = String(idinstituicao);
    INSTITUICAO_CURSOS[chave] = (INSTITUICAO_CURSOS[chave] || []).filter(id => id !== idCurso);
    try { localStorage.setItem(LS_PREFIX + "instituicaocursos", JSON.stringify(INSTITUICAO_CURSOS)); } catch (e) {}
    ULTIMO_SALVAMENTO_LOCAL["instituicaocursos"] = Date.now();
  }
  selectCursosInst(idinstituicao, document.querySelector(`#cursos-inst-items .regras-item.active`));
}

async function adicionarCursoInstituicao(idinstituicao) {
  if (!adminMode) return;
  const chave = String(idinstituicao);
  const jaTem = new Set((INSTITUICAO_CURSOS[chave] || []).map(Number));
  const disponiveis = Object.keys(CURSOS_CATALOGO)
    .map(id => ({ id: Number(id), nome: CURSOS_CATALOGO[id] }))
    .filter(c => !jaTem.has(c.id))
    .sort((a, b) => a.id - b.id);
  if (disponiveis.length === 0) {
    alert("Esta instituição já tem todos os cursos do catálogo.");
    return;
  }
  const listaTexto = disponiveis.map(c => `${c.id} — ${c.nome}`).join("\n");
  const digitado = prompt(`Digite o ID do curso a adicionar:\n\n${listaTexto}`, "");
  if (digitado === null) return;
  const idCurso = parseInt(digitado.trim(), 10);
  if (!disponiveis.some(c => c.id === idCurso)) {
    alert("ID de curso inválido.");
    return;
  }
  const resultado = await chamarRpcAdmin("adicionar_curso_instituicao", {
    p_admin_senha: adminSenha,
    p_idinstituicao: idinstituicao,
    p_idcurso: idCurso
  });
  avisarFalhaSalvarNuvem(resultado);
  if (resultado !== false) {
    if (!INSTITUICAO_CURSOS[chave]) INSTITUICAO_CURSOS[chave] = [];
    INSTITUICAO_CURSOS[chave].push(idCurso);
    try { localStorage.setItem(LS_PREFIX + "instituicaocursos", JSON.stringify(INSTITUICAO_CURSOS)); } catch (e) {}
    ULTIMO_SALVAMENTO_LOCAL["instituicaocursos"] = Date.now();
  }
  selectCursosInst(idinstituicao, document.querySelector(`#cursos-inst-items .regras-item.active`));
}

function initCursosScreen() {
  const estadosComInst = Array.from(new Set(DB.instituicoes.map(i => cursosEstadoReal(i)).filter(Boolean)));
  const estados = Array.from(new Set([ ...estadosComInst, ...CURSOS_ESTADOS_MANUAL ]));
  estados.sort((a, b) => {
    const idsA = DB.instituicoes.filter(i => cursosEstadoReal(i) === a).map(i => i.idinstituicao);
    const idsB = DB.instituicoes.filter(i => cursosEstadoReal(i) === b).map(i => i.idinstituicao);
    const minA = idsA.length ? Math.min(...idsA) : Infinity;
    const minB = idsB.length ? Math.min(...idsB) : Infinity;
    return minA - minB;
  });
  cursosEstadosList = estados;
  cursosEstadoAtual = cursosEstadoAtual && estados.includes(cursosEstadoAtual) ? cursosEstadoAtual : estados[0] || null;
  document.getElementById("cursos-inst-search").value = "";
  renderCursosEstados(estados);
  renderCursosInstList();
  document.getElementById("cursos-detail-pane").innerHTML = `
        <div class="regras-empty-state">
          <div class="icon"></div>
          <p>Selecione uma instituição para ver os cursos disponíveis</p>
        </div>`;
}

async function adicionarEstadoCursos() {
  const nome = prompt("Nome do novo estado:", "");
  if (nome === null) return;
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    alert("Digite um nome para o estado.");
    return;
  }
  if (cursosEstadosList.includes(nomeLimpo)) {
    alert("Esse estado já existe na lista.");
    return;
  }
  CURSOS_ESTADOS_MANUAL.push(nomeLimpo);
  const resultado = await resyncDataBlock("cursosestadostodos", montarListaCursosEstados());
  avisarFalhaSalvarNuvem(resultado);
  cursosEstadoAtual = nomeLimpo;
  initCursosScreen();
}

async function excluirEstadoCursos(uf) {
  const qtd = DB.instituicoes.filter(i => cursosEstadoReal(i) === uf).length;
  const aviso = qtd > 0 ? ` Isso vai excluir também ${qtd} instituição(ões) cadastrada(s) nele.` : "";
  if (!confirm(`Excluir o estado "${cursosUfLabel(uf)}"?${aviso}`)) return;
  let resultado;
  if (qtd > 0) {
    const idsRemover = DB.instituicoes.filter(i => cursosEstadoReal(i) === uf).map(i => i.idinstituicao);
    DB.instituicoes = DB.instituicoes.filter(i => !idsRemover.includes(i.idinstituicao));
    resultado = await resyncDataBlock("db", DB);
  }
  const idx = CURSOS_ESTADOS_MANUAL.indexOf(uf);
  if (idx !== -1) CURSOS_ESTADOS_MANUAL.splice(idx, 1);
  delete CURSOS_UF_LABEL[uf];
  const resultado2 = await resyncDataBlock("cursosestadostodos", montarListaCursosEstados());
  avisarFalhaSalvarNuvem(resultado === false || resultado2 === false ? false : (resultado === null || resultado2 === null ? null : true));
  cursosEstadoAtual = null;
  initCursosScreen();
}

async function adicionarInstituicaoCursos() {
  if (!cursosEstadoAtual) {
    alert("Selecione ou adicione um estado primeiro.");
    return;
  }
  const mantenedoraPadrao = DB.mantenedoras[0];
  if (!mantenedoraPadrao) {
    alert("Cadastre uma mantenedora antes de adicionar instituições.");
    return;
  }
  const nome = prompt(`Nome da nova instituição em ${cursosUfLabel(cursosEstadoAtual)}:`, "");
  if (nome === null) return;
  const nomeLimpo = nome.trim() || "Nova instituição";
  const novoId = proximoId("instituicoes", "idinstituicao");
  DB.instituicoes.push({
    idinstituicao: novoId,
    idmantenedora: mantenedoraPadrao.idmantenedora,
    nome: nomeLimpo,
    nome_abreviado: nomeLimpo,
    estado: cursosEstadoAtual
  });
  const resultado = await resyncDataBlock("db", DB);
  avisarFalhaSalvarNuvem(resultado);
  initCursosScreen();
  selectCursosEstado(cursosEstadoAtual);
}

function renderCursosEstados(estados) {
  const cont = document.getElementById("cursos-estados-list");
  let html = "";
  estados.forEach((uf, idx) => {
    const qtd = DB.instituicoes.filter(i => cursosEstadoReal(i) === uf).length;
    const ativo = uf === cursosEstadoAtual ? "active" : "";
    const delBtn = adminMode ? `<span class="regras-cat-del" data-del-uf-idx="${idx}" title="Excluir estado">🗑️</span>` : "";
    html += `
          <button class="regras-cat-btn ${ativo}" data-uf-idx="${idx}">
            <span class="regras-cat-num" data-num="${idx + 1}"></span>
            <span class="regras-cat-label">${cursosUfLabel(uf)}</span>
            <span class="regras-cat-count">${qtd}</span>
            ${delBtn}
          </button>`;
  });
  cont.innerHTML = html || `<div class="regras-empty-list">Nenhum estado cadastrado</div>`;
  cont.querySelectorAll(".regras-cat-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      if (e.target.closest("[data-del-uf-idx]")) return;
      const idx = Number(btn.getAttribute("data-uf-idx"));
      selectCursosEstado(cursosEstadosList[idx]);
    });
  });
  cont.querySelectorAll("[data-del-uf-idx]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      const idx = Number(el.getAttribute("data-del-uf-idx"));
      excluirEstadoCursos(cursosEstadosList[idx]);
    });
  });
}

function selectCursosEstado(uf) {
  cursosEstadoAtual = uf;
  document.querySelectorAll("#cursos-estados-list .regras-cat-btn").forEach(b => {
    const idx = Number(b.getAttribute("data-uf-idx"));
    b.classList.toggle("active", cursosEstadosList[idx] === uf);
  });
  document.getElementById("cursos-inst-search").value = "";
  renderCursosInstList();
  document.getElementById("cursos-detail-pane").innerHTML = `
        <div class="regras-empty-state">
          <div class="icon"></div>
          <p>Selecione uma instituição para ver os cursos disponíveis</p>
        </div>`;
}

function renderCursosInstList() {
  const q = document.getElementById("cursos-inst-search").value.trim().toLowerCase();
  const listEl = document.getElementById("cursos-inst-items");
  const titleEl = document.getElementById("cursos-inst-title");
  const countEl = document.getElementById("cursos-inst-count");
  let itens;
  if (q) {
    itens = DB.instituicoes.filter(i => (i.nome_abreviado || "").toLowerCase().includes(q) || (i.nome || "").toLowerCase().includes(q) || (i.cidade || "").toLowerCase().includes(q));
    titleEl.textContent = `Resultados para "${q}"`;
  } else {
    itens = DB.instituicoes.filter(i => cursosEstadoReal(i) === cursosEstadoAtual);
    titleEl.textContent = cursosEstadoAtual ? cursosUfLabel(cursosEstadoAtual) : "Instituições";
  }
  countEl.textContent = itens.length + (itens.length === 1 ? " instituição" : " instituições");
  let html = "";
  itens.forEach(inst => {
    const qtdCursos = getCursosForInst(inst).length;
    const delBtn = adminMode ? `<span class="regras-item-del" data-del-inst="${inst.idinstituicao}" title="Excluir instituição">🗑️</span>` : "";
    html += `
          <div class="regras-item" onclick="selectCursosInst(${inst.idinstituicao}, this)">
            <div class="regras-item-icon">🏢</div>
            <div class="regras-item-info">
              <div class="regras-item-title">${inst.nome_abreviado || inst.nome}</div>
              <div class="regras-item-preview">${inst.cidade || "—"} · ${qtdCursos} curso${qtdCursos === 1 ? "" : "s"} disponíve${qtdCursos === 1 ? "l" : "is"}</div>
            </div>
            ${delBtn}
          </div>`;
  });
  listEl.innerHTML = html || `<div class="regras-empty-list">Nenhuma instituição encontrada</div>`;
  listEl.querySelectorAll("[data-del-inst]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      excluirRegistro("instituicoes", Number(el.getAttribute("data-del-inst")));
      initCursosScreen();
    });
  });
}

function selectCursosInst(idinstituicao, el) {
  document.querySelectorAll("#cursos-inst-items .regras-item.active").forEach(x => x.classList.remove("active"));
  if (el) el.classList.add("active");
  const inst = DB.instituicoes.find(i => i.idinstituicao === idinstituicao);
  if (!inst) return;
  activeCursoId = null;
  activeInstId = inst.idinstituicao;
  const cursos = getCursosForInst(inst);
  let html = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">🏢</div>
            <div>
              <div class="regras-detail-breadcrumb">${cursosEstadoReal(inst) || ""}${inst.cidade ? " · " + inst.cidade : ""}</div>
              <h2>${inst.nome_abreviado || inst.nome}</h2>
            </div>
          </div>
          <div class="cursos-section-header" style="margin-top:10px">
            📚 Cursos disponíveis &nbsp;<span style="font-size:10px;font-weight:400;color:var(--texto-muted)">(${cursos.length} cursos)</span>
            ${adminMode ? `<button class="admin-dashed-btn" style="margin-left:10px;font-size:10px;padding:3px 9px;" onclick="adicionarCursoInstituicao(${inst.idinstituicao})">➕ Adicionar curso</button>` : ""}
          </div>
          <div class="cursos-grid" id="cursos-grid">`;
  if (cursos.length === 0) {
    html += `<div class="extra-empty">Nenhum curso cadastrado para esta instituição</div>`;
  } else {
    cursos.forEach(curso => {
      html += `<div class="curso-btn-wrap" style="position:relative;display:inline-flex;">
            <button class="curso-btn" id="cbtn-${curso.id}" onclick="selectCurso(${curso.id}, this)">
              <span class="curso-id">#${curso.id}</span>
              ${curso.nome}
            </button>
            ${adminMode ? `<span class="regras-item-del" title="Excluir curso desta instituição"
                   style="position:absolute;top:-6px;right:-6px;background:#fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.18);"
                   onclick="event.stopPropagation(); excluirCursoDeInstituicao(${inst.idinstituicao}, ${curso.id}, '${(curso.nome || "").replace(/'/g, "\\'")}')">🗑️</span>` : ""}
          </div>`;
    });
  }
  html += `</div>
          <div id="curso-detail-area"></div>
        </div>`;
  document.getElementById("cursos-detail-pane").innerHTML = html;
}

// 🆕 Lê direto de INSTITUICAO_CURSOS (tabela unificada instituicao_cursos)
function getCursosForInst(inst) {
  const ids = INSTITUICAO_CURSOS[String(inst.idinstituicao)] || [];
  return ids
    .map(id => ({ id, nome: CURSOS_CATALOGO[String(id)] || `Curso #${id}` }))
    .sort((a, b) => a.id - b.id);
}

const DISCIPLINAS = {};

const AVAS = {};

const CURRICULOS = {};

const DISCIPLINAS_CURRICULO = {};

const AVAS_CURRICULO = {};

const CERTIFICADOS = {};

const PROVAS_IMPRESSAS = {};

const ATIVIDADE_PRESENCIAL = new Set([]);

let activeCursoId = null;

let activeInstId = null;

function getCurriculosForCursoInst(cursoId, instId) {
  const lista = CURRICULOS[cursoId] || [];
  const especificos = lista.filter(c => c.idinst === instId);
  if (especificos.length > 0) return {
    items: especificos,
    modo: "especifico"
  };
  const genericos = lista.filter(c => c.idinst === null);
  if (genericos.length > 0) return {
    items: genericos,
    modo: "generico"
  };
  if (lista.length > 0) return {
    items: lista,
    modo: "todos"
  };
  return {
    items: [],
    modo: "vazio"
  };
}

function cargaTexto(c) {
  const partes = [];
  if (c.carga_presencial) partes.push(`${c.carga_presencial}h presencial`);
  if (c.carga_distancia) partes.push(`${c.carga_distancia}h EAD`);
  if (c.carga_total) partes.push(`${c.carga_total}h total`);
  return partes.join(" · ");
}

function selectCurso(cursoId, btn) {
  document.querySelectorAll(".curso-btn").forEach(b => b.classList.remove("active"));
  if (activeCursoId === cursoId) {
    activeCursoId = null;
    document.getElementById("curso-detail-area").innerHTML = "";
    return;
  }
  activeCursoId = cursoId;
  btn.classList.add("active");
  const instId = activeInstId;
  let html = `<div class="curso-detail">`;
  const {items: curriculos, modo: modoCurriculo} = getCurriculosForCursoInst(cursoId, instId);
  html += `<div class="extra-box">
    <div class="extra-box-header">📋 Currículo do curso</div>`;
  if (modoCurriculo === "todos") {
    html += `<div class="extra-note">Nenhum currículo específico cadastrado para esta instituição — exibindo todos os currículos do curso:</div>`;
  } else if (modoCurriculo === "generico") {
    html += `<div class="extra-note">Currículo geral aplicado a esta instituição:</div>`;
  }
  html += `<div class="extra-box-body">`;
  if (curriculos.length === 0) {
    html += `<div class="extra-empty">Nenhum currículo cadastrado para este curso</div>`;
  } else {
    curriculos.forEach(c => {
      const carga = cargaTexto(c);
      html += `<button class="extra-row curriculo-btn" id="curbtn-${c.id}" onclick="selectCurriculo(${c.id}, ${cursoId}, this)">
        <span class="extra-id">${c.id}</span>
        <span class="extra-name">${c.nome}${carga ? ` <span style="color:var(--texto-muted)">— ${carga}</span>` : ""}</span>
      </button>`;
    });
  }
  html += `</div></div>`;
  html += `<div class="curso-detail-card">
      <div class="curso-cols">
        <div class="curso-col">
          <div class="curso-col-title">📖 Disciplinas <span id="disciplinas-count" style="margin-left:auto;font-size:10px;font-weight:400;color:var(--texto-muted)">(0)</span></div>
          <div class="curso-items-list" id="disciplinas-list">
            <div class="curso-items-placeholder">Selecione um currículo acima para ver as disciplinas</div>
          </div>
        </div>
        <div class="curso-col">
          <div class="curso-col-title">🖥️ AVAs <span id="avas-count" style="margin-left:auto;font-size:10px;font-weight:400;color:var(--texto-muted)">(0)</span></div>
          <div class="curso-items-list" id="avas-list">
            <div class="curso-items-placeholder">Selecione um currículo acima para ver os AVAs</div>
          </div>
        </div>
      </div>
    </div>`;
  const temPresencial = ATIVIDADE_PRESENCIAL.has(`${instId}-${cursoId}`);
  html += `<div class="presencial-box" style="margin-top:12px">
    <span>🏫 Este curso tem atividade presencial nesta instituição:</span>
    <span class="presencial-tag ${temPresencial ? "sim" : "nao"}">${temPresencial ? "SIM" : "NÃO"}</span>
  </div>`;
  const certificados = CERTIFICADOS[instId] && CERTIFICADOS[instId][cursoId] || [];
  html += `<div class="extra-box">
    <div class="extra-box-header">🎓 Certificados &nbsp;<span class="extra-meta">(${certificados.length})</span></div>
    <div class="extra-box-body">`;
  if (certificados.length === 0) {
    html += `<div class="extra-empty">Nenhum certificado cadastrado para esta instituição neste curso</div>`;
  } else {
    certificados.forEach(c => {
      html += `<div class="extra-row">
        <span class="extra-id">${c.id}</span>
        <span class="extra-name">${c.nome}</span>
      </div>`;
    });
  }
  html += `</div></div>`;
  if (cursoId === 132 || cursoId === 144) {
    const provas = PROVAS_IMPRESSAS[instId] && PROVAS_IMPRESSAS[instId][cursoId] || [];
    html += `<div class="extra-box">
      <div class="extra-box-header">🖨️ Provas impressas &nbsp;<span class="extra-meta">(${provas.length})</span></div>
      <div class="extra-box-body">`;
    if (provas.length === 0) {
      html += `<div class="extra-empty">Nenhuma prova impressa cadastrada para esta instituição neste curso</div>`;
    } else {
      provas.forEach(p => {
        html += `<div class="extra-row">
          <span class="extra-id">${p.id}</span>
          <span class="extra-name">${p.nome} <span style="color:var(--texto-muted)">(disciplina ${p.iddisciplina})</span></span>
        </div>`;
      });
    }
    html += `</div></div>`;
  }
  html += `</div>`;
  document.getElementById("curso-detail-area").innerHTML = html;
  document.getElementById("curso-detail-area").scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
  if (curriculos.length === 1) {
    selectCurriculo(curriculos[0].id, cursoId, document.getElementById(`curbtn-${curriculos[0].id}`));
  }
}

function selectCurriculo(curriculoId, cursoId, btn) {
  document.querySelectorAll(".curriculo-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const disciplinas = DISCIPLINAS_CURRICULO[curriculoId] || DISCIPLINAS[cursoId] || [];
  const avas = AVAS_CURRICULO[curriculoId] || AVAS[cursoId] || [];
  document.getElementById("disciplinas-count").textContent = `(${disciplinas.length})`;
  document.getElementById("avas-count").textContent = `(${avas.length})`;
  let discHtml = "";
  if (disciplinas.length === 0) {
    discHtml = `<div class="curso-item-row"><span style="color:var(--texto-muted);font-size:11px">Nenhuma disciplina registrada</span></div>`;
  } else {
    disciplinas.forEach(d => {
      discHtml += `<div class="curso-item-row">
        <span class="curso-item-id">${d.id}</span>
        <span class="curso-item-name">${d.nome}</span>
      </div>`;
    });
  }
  document.getElementById("disciplinas-list").innerHTML = discHtml;
  let avaHtml = "";
  if (avas.length === 0) {
    avaHtml = `<div class="curso-item-row"><span style="color:var(--texto-muted);font-size:11px">Nenhum AVA registrado</span></div>`;
  } else {
    avas.forEach(a => {
      avaHtml += `<div class="curso-item-row">
        <span class="curso-item-id">${a.id}</span>
        <span class="curso-item-name">${a.nome}</span>
      </div>`;
    });
  }
  document.getElementById("avas-list").innerHTML = avaHtml;
}
