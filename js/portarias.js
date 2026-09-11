/**
 * IBREP Prism — Módulo: Atos Normativos (Portarias)
 * -----------------------------------------------------
 * Tudo que é específico da tela "Atos Normativos" (mapa do Brasil,
 * ficha por estado, portarias/pareceres, formulário completo de admin)
 * mora aqui.
 *
 * Carregado de forma "eager" (normal <script src>) no index.html, porque
 * `aplicarDadosSalvos()` já espera encontrar `PORTARIAS_DATA` e
 * `ESTADOS_GRID` prontos assim que a página carrega. O HTML da tela
 * (telas/portarias.html, com o mapa em SVG) é que é carregado sob
 * demanda, só quando o usuário clica no botão.
 */

function openPortarias() {
  if (!exigirPermissao("portarias")) return;
  irParaTela("portarias");
}

const ESTADOS_GRID = [];

function flRow(label, value) {
  return `<div style="display:flex;gap:10px;padding:10px 14px;border-bottom:1px solid var(--cinza-borda);">\n    <span style="flex:0 0 118px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--roxo);padding-top:1px;">${label}</span>\n    <span style="flex:1;font-size:13px;line-height:1.55;color:var(--texto);">${value}</span>\n  </div>`;
}

function flBox(rowsHtml) {
  return `<div style="border:1px solid var(--cinza-borda);border-radius:10px;overflow:hidden;background:#fff;">${rowsHtml}</div>`;
}

function flUnidade(titulo, rowsHtml, locais) {
  const locaisHtml = locais && locais.length ? `\n    <div style="padding:10px 14px;">\n      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--texto-muted);margin-bottom:6px;">Pareceres por polo</div>\n      ${locais.map(l => `<div style="font-size:12.5px;line-height:1.5;background:var(--roxo-claro);border-left:3px solid var(--roxo);padding:6px 10px;border-radius:6px;margin-bottom:6px;"><b style="color:var(--roxo-hover);">${l.local}</b> — ${l.texto}</div>`).join("")}\n    </div>` : "";
  return `\n  <div style="border:1px solid var(--roxo-medio);border-radius:10px;overflow:hidden;margin-top:14px;">\n    <div style="background:var(--roxo-claro);color:var(--roxo-hover);font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:8px 14px;">${titulo}</div>\n    ${rowsHtml}\n    ${locaisHtml}\n  </div>`;
}

function flResponsaveis(r) {
  if (!r) return "";
  const linhas = [
    [ "👤 Secretário(a)", r.nomeSecretario ? `${r.nomeSecretario} <span style="color:var(--texto-muted);">— Portaria nº ${r.portariaSecretario || "—"}</span>` : "" ],
    [ "🎓 Diretor(a)", r.nomeDiretor ? `${r.nomeDiretor} <span style="color:var(--texto-muted);">— Portaria nº ${r.portariaDiretor || "—"}</span>` : "" ],
    [ "📘 Coord. do Curso", r.coordenadorCurso || "" ],
    [ "🧭 Coord. de Estágio", r.coordenadorEstagio || "" ]
  ].filter(([ , v ]) => v);
  if (!linhas.length) return "";
  return `<div style="border:1px solid var(--cinza-borda);border-radius:10px;overflow:hidden;background:#fff;">` +
    linhas.map(([ label, valor ], i) => `\n    <div style="display:flex;gap:10px;padding:8px 14px;min-height:38px;box-sizing:border-box;${i < linhas.length - 1 ? "border-bottom:1px solid var(--cinza-borda);" : ""}">\n      <span style="flex:0 0 140px;display:flex;align-items:center;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--roxo);">${label}</span>\n      <span style="flex:1;display:flex;align-items:center;font-size:13px;line-height:1.35;color:var(--texto);">${valor}</span>\n    </div>`).join("") + `\n  </div>`;
}

// Renderiza uma lista de pares [rótulo, valor] como uma caixa de linhas, pulando valores vazios.
function flCamposBox(pares) {
  const linhas = (pares || []).filter(([ , v ]) => v !== undefined && v !== null && String(v).trim() !== "");
  if (!linhas.length) return "";
  return `<div style="border:1px solid var(--cinza-borda);border-radius:10px;overflow:hidden;background:#fff;">` +
    linhas.map(([ label, valor ], i) => `\n    <div style="display:flex;gap:10px;padding:8px 14px;min-height:38px;box-sizing:border-box;${i < linhas.length - 1 ? "border-bottom:1px solid var(--cinza-borda);" : ""}">\n      <span style="flex:0 0 170px;display:flex;align-items:center;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--roxo);">${escapeHtmlRegra(String(label))}</span>\n      <span style="flex:1;display:flex;align-items:center;font-size:13px;line-height:1.35;color:var(--texto);white-space:pre-line;">${String(valor)}</span>\n    </div>`).join("") + `\n  </div>`;
}

// Campos "simples" (texto curto) da Fundamentação Legal e dos Dados do Curso.
// Usados tanto para montar o formulário quanto para ler e salvar os valores.
const CAMPOS_FUNDAMENTACAO = [
  { key: "leiPrincipal", label: "Lei Principal" },
  { key: "resolucao", label: "Resolução" },
  { key: "parecer", label: "Autorização" },
  { key: "cofeci", label: "Código COFECI" },
  { key: "sistec", label: "SISTEC" },
  { key: "censoEscolar", label: "Censo Escolar" },
  { key: "validade", label: "Validade" }
];
const PORTARIAS_DATA = {};

function selectEstado(uf) {
  document.querySelectorAll("#br-map-svg a.uf").forEach(a => a.classList.remove("active"));
  const target = document.querySelector(`#br-map-svg a.uf[data-uf="${uf}"]`);
  if (target) target.classList.add("active");
  const estado = ESTADOS_GRID.find(e => e.uf === uf);
  const dados = PORTARIAS_DATA[uf];
  const pane = document.getElementById("port-detail-pane");
  if (!dados) {
    const podeAdicionar = adminMode ? `<div style="display:flex;flex-direction:column;gap:10px;margin-top:18px;max-width:320px;">\n               <button class="admin-dashed-btn" onclick="abrirFormularioEstadoCompleto('${uf}')">📝 Cadastrar dados deste estado</button>\n             </div>` : "";
    pane.innerHTML = `\n          <div class="port-detail-header">\n            <div class="port-detail-title">${estado.nome} (${uf})</div>\n          </div>\n          <div class="port-empty" style="height:auto;padding:40px 0;">\n            <div class="icon">📭</div>\n            <p>Nenhuma portaria ou parecer cadastrado para este estado ainda.</p>\n            ${adminMode ? `<p style="font-size:12px;margin-top:4px;">Escolha abaixo o que deseja cadastrar:</p>` : ""}\n            ${podeAdicionar}\n          </div>`;
    return;
  }
  const docsHtml = (dados.portarias || []).map(d => `\n        <div class="port-doc-item">\n          <div class="port-doc-nome">${d.nome}</div>\n          <div class="port-doc-meta">${d.data}</div>\n          ${d.link ? `<a href="${d.link}" target="_blank">Ver documento →</a>` : ""}\n        </div>\n      `).join("") || '<div class="port-doc-meta">Nenhum documento cadastrado.</div>';
  const fundamentacaoBox = flCamposBox([
    [ "Mantenedora / Razão Social", dados.razaoSocial ],
    [ "Documento (CNPJ)", dados.documento ],
    ...CAMPOS_FUNDAMENTACAO.map(f => [ f.label, dados[f.key] ])
  ]);
  const delBtn = tipo => adminMode ? `<button class="admin-danger-btn" style="padding:2px 8px;font-size:11px;margin-left:8px;" onclick="excluirBlocoEstado('${uf}','${tipo}')" title="Excluir este bloco">🗑️</button>` : "";
  pane.innerHTML = `\n        <div class="port-detail-header">\n          <div class="port-detail-title">${estado.nome} (${uf})</div>\n          ${dados.statusLabel ? `<div class="port-status-badge port-status-${dados.status}">${dados.statusLabel}${delBtn("situacao")}</div>` : ""}\n        </div>\n        ${fundamentacaoBox ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Fundamentação Legal</span>${delBtn("fundamentacao")}</div>\n          <div class="port-section-text">${fundamentacaoBox}</div>\n        </div>` : ""}\n        ${dados.fundamentacaoLegal ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Fundamentação Legal (texto livre)</span>${delBtn("fundamentacaoLivre")}</div>\n          <div class="port-section-text">${dados.fundamentacaoLegal}</div>\n        </div>` : ""}\n        ${dados.responsaveis ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Secretário, Diretor e Coordenadores Responsáveis</span>${delBtn("responsaveis")}</div>\n          <div class="port-section-text">${flResponsaveis(dados.responsaveis)}</div>\n        </div>` : ""}\n        ${dados.observacoes ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Observações</span>${delBtn("observacoes")}</div>\n          <div class="port-section-text">${dados.observacoes}</div>\n        </div>` : ""}\n        ${dados.portarias && dados.portarias.length ? `\n        <div class="port-section">\n          <div class="port-section-title">Portarias e Documentos</div>\n          ${docsHtml}\n        </div>` : ""}\n        ${adminMode ? `\n        <div style="display:flex;flex-direction:column;gap:10px;margin:22px auto 0;max-width:320px;">\n          <button class="admin-edit-btn" onclick="abrirFormularioEstadoCompleto('${uf}')">✏️ Editar todos os dados</button>\n          <button class="admin-dashed-btn" onclick="criarBlocoEstado('${uf}','unidade')">➕ Unidade de Ensino</button>\n        </div>` : ""}`;
}

// Adiciona botões de editar/excluir na ficha do estado quando o modo admin está ativo
const _selectEstadoOriginal = selectEstado;

selectEstado = function(uf) {
  _selectEstadoOriginal(uf);
  if (!adminMode) return;
  const dados = PORTARIAS_DATA[uf];
  if (!dados) return;
  const header = document.querySelector("#port-detail-pane .port-detail-header");
  if (header) {
    const delBtn = document.createElement("button");
    delBtn.className = "admin-danger-btn";
    delBtn.style.marginLeft = "auto";
    delBtn.textContent = "🗑️ Excluir dados do estado";
    delBtn.onclick = () => excluirDadosEstado(uf);
    header.appendChild(delBtn);
  }
  const secoes = document.querySelectorAll("#port-detail-pane .port-section");
  secoes.forEach(sec => {
    const titulo = sec.querySelector(".port-section-title");
    if (!titulo) return;
    const rotulo = (titulo.querySelector("span") || titulo).textContent.trim();
    if (rotulo === "Fundamentação Legal (texto livre)") {
      const btn = document.createElement("button");
      btn.className = "admin-edit-btn";
      btn.style.marginLeft = "10px";
      btn.textContent = "✏️ Editar";
      const textoDiv = sec.querySelector(".port-section-text");
      btn.onclick = () => ativarEdicaoFundamentacao(uf, textoDiv, btn);
      const lixeira = titulo.querySelector(".admin-danger-btn");
      if (lixeira) titulo.insertBefore(btn, lixeira); else titulo.appendChild(btn);
    }
  });
};

async function criarBlocoEstado(uf, tipo) {
  if (!PORTARIAS_DATA[uf]) PORTARIAS_DATA[uf] = {};
  const dados = PORTARIAS_DATA[uf];
  if (tipo === "fundamentacao") {
    dados.fundamentacaoLegal = (dados.fundamentacaoLegal || "") + flBox(flRow("Lei Principal", "Preencha aqui a lei/base legal") + flRow("Resolução", "Preencha aqui a resolução aplicável") + flRow("Autorização", "Preencha aqui o parecer/autorização") + flRow("Validade", "Preencha aqui a validade"));
  } else if (tipo === "responsaveis") {
    dados.responsaveis = {
      nomeSecretario: "",
      portariaSecretario: "",
      nomeDiretor: "",
      portariaDiretor: ""
    };
  } else if (tipo === "unidade") {
    dados.fundamentacaoLegal = (dados.fundamentacaoLegal || "") + flUnidade("Unidade de Ensino", flRow("Parecer", "Preencha aqui o parecer da unidade") + flRow("Portaria", "Preencha aqui a portaria"), []);
  }
  const resultado = await resyncDataBlock("portarias", PORTARIAS_DATA);
  selectEstado(uf);
  avisarFalhaSalvarNuvem(resultado);
}

function abrirFormularioEstadoCompleto(uf) {
  if (!adminMode) return;
  const estado = ESTADOS_GRID.find(e => e.uf === uf);
  const dados = PORTARIAS_DATA[uf] || {};
  const r = dados.responsaveis || {};
  const pane = document.getElementById("port-detail-pane");

  const opcoesMantenedoras = (DB.mantenedoras || []).map(m =>
    `<option value="${m.idmantenedora}" data-razao="${escapeHtmlRegra(m.razao_social || "")}" data-doc="${escapeHtmlRegra(m.documento || "")}" ${String(dados.mantenedoraId || "") === String(m.idmantenedora) ? "selected" : ""}>${escapeHtmlRegra(m.razao_social || "")}</option>`
  ).join("");

  const camposFundamentacaoHtml = CAMPOS_FUNDAMENTACAO.map(f =>
    `<label>${f.label}</label>\n          <div style="display:flex;gap:6px;margin-bottom:4px;">\n            <button type="button" onclick="aplicarFormatoCampo('pf-fund-${f.key}','b')" style="border:1px solid var(--cinza-borda);background:#fff;border-radius:5px;width:26px;height:24px;font-weight:700;cursor:pointer;font-size:12px;" title="Negrito">B</button>\n            <button type="button" onclick="aplicarFormatoCampo('pf-fund-${f.key}','u')" style="border:1px solid var(--cinza-borda);background:#fff;border-radius:5px;width:26px;height:24px;text-decoration:underline;cursor:pointer;font-size:12px;" title="Sublinhado">S</button>\n          </div>\n          <textarea id="pf-fund-${f.key}" rows="2" style="resize:vertical;">${escapeHtmlRegra(dados[f.key] || "")}</textarea>`
  ).join("\n          ");

  pane.innerHTML = `\n        <div class="port-detail-header">\n          <div class="port-detail-title">${estado.nome} (${uf})</div>\n        </div>\n        <div class="admin-inline-form" style="max-width:560px;">\n          <h3 style="font-size:12.5px;color:var(--roxo);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px;">📌 Situação</h3>\n          <label>Status</label>\n          <select id="pf-status">\n            <option value="" ${!dados.status ? "selected" : ""}>Sem selo de status</option>\n            <option value="ok" ${dados.status === "ok" ? "selected" : ""}>OK (verde)</option>\n            <option value="alerta" ${dados.status === "alerta" ? "selected" : ""}>Alerta (amarelo)</option>\n            <option value="pendente" ${dados.status === "pendente" ? "selected" : ""}>Pendente (vermelho)</option>\n          </select>\n          <label>Rótulo do status (texto exibido no selo)</label>\n          <input type="text" id="pf-status-label" value="${escapeHtmlRegra(dados.statusLabel || "")}" placeholder="Ex.: Regularizado">\n\n          <h3 style="font-size:12.5px;color:var(--roxo);text-transform:uppercase;letter-spacing:.04em;margin:20px 0 10px;">📄 Fundamentação Legal</h3>\n          <label>Mantenedora</label>\n          <select id="pf-mantenedora" onchange="preencherMantenedoraSelecionada()">\n            <option value="">Selecione a mantenedora...</option>\n            ${opcoesMantenedoras}\n          </select>\n          <label>Razão Social</label>\n          <input type="text" id="pf-razao-social" value="${escapeHtmlRegra(dados.razaoSocial || "")}" readonly style="background:var(--cinza-light);">\n          <label>Documento (CNPJ)</label>\n          <input type="text" id="pf-documento" value="${escapeHtmlRegra(dados.documento || "")}" readonly style="background:var(--cinza-light);">\n          ${camposFundamentacaoHtml}\n          <label>Observações (aceita HTML simples, sempre visível na ficha do estado)</label>\n          <textarea id="pf-observacoes">${dados.observacoes || ""}</textarea>\n\n          <h3 style="font-size:12.5px;color:var(--roxo);text-transform:uppercase;letter-spacing:.04em;margin:20px 0 10px;">👤 Secretário, Diretor e Coordenadores Responsáveis</h3>\n          <label>Nome do(a) Secretário(a)</label>\n          <input type="text" id="pf-nome-sec" value="${escapeHtmlRegra(r.nomeSecretario || "")}">\n          <label>Portaria do(a) Secretário(a)</label>\n          <input type="text" id="pf-portaria-sec" value="${escapeHtmlRegra(r.portariaSecretario || "")}">\n          <label>Nome do(a) Diretor(a)</label>\n          <input type="text" id="pf-nome-dir" value="${escapeHtmlRegra(r.nomeDiretor || "")}">\n          <label>Portaria do(a) Diretor(a)</label>\n          <input type="text" id="pf-portaria-dir" value="${escapeHtmlRegra(r.portariaDiretor || "")}">\n          <label>Coordenador(a) do Curso</label>\n          <input type="text" id="pf-coord-curso" value="${escapeHtmlRegra(r.coordenadorCurso || "")}">\n          <label>Coordenador(a) de Estágio</label>\n          <input type="text" id="pf-coord-estagio" value="${escapeHtmlRegra(r.coordenadorEstagio || "")}">\n\n          <div style="display:flex;gap:8px;margin-top:6px;">\n            <button class="admin-edit-btn save" onclick="salvarFormularioEstadoCompleto('${uf}')">💾 Salvar tudo</button>\n            <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="selectEstado('${uf}')">Cancelar</button>\n          </div>\n        </div>`;

  if (dados.mantenedoraId) preencherMantenedoraSelecionada();
}

function preencherMantenedoraSelecionada() {
  const select = document.getElementById("pf-mantenedora");
  if (!select) return;
  const opt = select.options[select.selectedIndex];
  document.getElementById("pf-razao-social").value = (opt && opt.dataset.razao) || "";
  document.getElementById("pf-documento").value = (opt && opt.dataset.doc) || "";
}

// Envolve o texto selecionado num campo <textarea> com a tag informada (b/u),
// permitindo negrito e sublinhado nos campos de Fundamentação Legal.
function aplicarFormatoCampo(id, tag) {
  const el = document.getElementById(id);
  if (!el) return;
  const inicio = el.selectionStart;
  const fim = el.selectionEnd;
  const texto = el.value;
  const selecionado = texto.substring(inicio, fim);
  if (!selecionado) { el.focus(); return; }
  const novoTexto = texto.substring(0, inicio) + `<${tag}>${selecionado}</${tag}>` + texto.substring(fim);
  el.value = novoTexto;
  el.focus();
  const novaPosicao = inicio + `<${tag}>${selecionado}</${tag}>`.length;
  el.setSelectionRange(novaPosicao, novaPosicao);
}

async function salvarFormularioEstadoCompleto(uf) {
  if (!PORTARIAS_DATA[uf]) PORTARIAS_DATA[uf] = {};
  const dados = PORTARIAS_DATA[uf];

  const status = document.getElementById("pf-status").value.trim();
  const statusLabel = document.getElementById("pf-status-label").value.trim();
  const mantenedoraSelect = document.getElementById("pf-mantenedora");
  const mantenedoraId = mantenedoraSelect.value.trim();
  const razaoSocial = document.getElementById("pf-razao-social").value.trim();
  const documento = document.getElementById("pf-documento").value.trim();
  const observacoes = document.getElementById("pf-observacoes").value.trim();
  const nomeSecretario = document.getElementById("pf-nome-sec").value.trim();
  const portariaSecretario = document.getElementById("pf-portaria-sec").value.trim();
  const nomeDiretor = document.getElementById("pf-nome-dir").value.trim();
  const portariaDiretor = document.getElementById("pf-portaria-dir").value.trim();
  const coordenadorCurso = document.getElementById("pf-coord-curso").value.trim();
  const coordenadorEstagio = document.getElementById("pf-coord-estagio").value.trim();

  if (status) dados.status = status; else delete dados.status;
  if (statusLabel) dados.statusLabel = statusLabel; else delete dados.statusLabel;
  if (mantenedoraId) dados.mantenedoraId = mantenedoraId; else delete dados.mantenedoraId;
  if (razaoSocial) dados.razaoSocial = razaoSocial; else delete dados.razaoSocial;
  if (documento) dados.documento = documento; else delete dados.documento;
  if (observacoes) dados.observacoes = observacoes; else delete dados.observacoes;

  CAMPOS_FUNDAMENTACAO.forEach(f => {
    const valor = document.getElementById(`pf-fund-${f.key}`).value.trim();
    if (valor) dados[f.key] = valor; else delete dados[f.key];
  });

  if (nomeSecretario || portariaSecretario || nomeDiretor || portariaDiretor || coordenadorCurso || coordenadorEstagio) {
    dados.responsaveis = { nomeSecretario, portariaSecretario, nomeDiretor, portariaDiretor, coordenadorCurso, coordenadorEstagio };
  } else {
    delete dados.responsaveis;
  }

  const resultado = await resyncDataBlock("portarias", PORTARIAS_DATA);
  selectEstado(uf);
  const header = document.querySelector("#port-detail-pane .port-detail-header");
  if (header) mostrarFlashSalvo(header);
  avisarFalhaSalvarNuvem(resultado);
}

async function excluirDadosEstado(uf) {
  if (!PORTARIAS_DATA[uf]) return;
  if (!confirm("Excluir TODOS os dados normativos cadastrados para este estado? Essa ação não pode ser desfeita.")) return;
  delete PORTARIAS_DATA[uf];
  const resultado = await resyncDataBlock("portarias", PORTARIAS_DATA);
  selectEstado(uf);
  avisarFalhaSalvarNuvem(resultado);
}

const NOMES_BLOCO_PORTARIA = {
  situacao: "Situação (status)",
  fundamentacao: "Fundamentação Legal",
  fundamentacaoLivre: "Fundamentação Legal (texto livre)",
  responsaveis: "Secretário, Diretor e Coordenadores Responsáveis",
  observacoes: "Observações"
};

async function excluirBlocoEstado(uf, tipo) {
  const dados = PORTARIAS_DATA[uf];
  if (!dados) return;
  if (!confirm(`Excluir o bloco "${NOMES_BLOCO_PORTARIA[tipo] || tipo}"? Essa ação não pode ser desfeita.`)) return;
  if (tipo === "situacao") {
    delete dados.status;
    delete dados.statusLabel;
  } else if (tipo === "fundamentacao") {
    delete dados.mantenedoraId;
    delete dados.razaoSocial;
    delete dados.documento;
    CAMPOS_FUNDAMENTACAO.forEach(f => delete dados[f.key]);
  } else if (tipo === "fundamentacaoLivre") {
    delete dados.fundamentacaoLegal;
  } else if (tipo === "responsaveis") {
    delete dados.responsaveis;
  } else if (tipo === "observacoes") {
    delete dados.observacoes;
  }
  const resultado = await resyncDataBlock("portarias", PORTARIAS_DATA);
  selectEstado(uf);
  avisarFalhaSalvarNuvem(resultado);
}

function ativarEdicaoFundamentacao(uf, textoDiv, btn) {
  textoDiv.setAttribute("contenteditable", "true");
  textoDiv.classList.add("admin-editable");
  textoDiv.focus();
  btn.textContent = "💾 Salvar";
  btn.onclick = async () => {
    const dados = PORTARIAS_DATA[uf];
    let resultado;
    if (dados) {
      dados.fundamentacaoLegal = textoDiv.innerHTML;
      resultado = await resyncDataBlock("portarias", PORTARIAS_DATA);
    }
    textoDiv.removeAttribute("contenteditable");
    textoDiv.classList.remove("admin-editable");
    mostrarFlashSalvo(btn.parentElement);
    btn.textContent = "✏️ Editar";
    btn.onclick = () => ativarEdicaoFundamentacao(uf, textoDiv, btn);
    avisarFalhaSalvarNuvem(resultado);
  };
}
