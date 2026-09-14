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
    [ "👤 Secretário(a)", r.nomeSecretario ? `${r.nomeSecretario} <span style="color:var(--texto-muted);"> — Portaria nº ${r.portariaSecretario || "—"}</span>` : "" ],
    [ "🎓 Diretor(a)", r.nomeDiretor ? `${r.nomeDiretor} <span style="color:var(--texto-muted);"> — Portaria nº ${r.portariaDiretor || "—"}</span>` : "" ],
    [ "📘 Coord. do Curso", r.coordenadorCurso || "" ],
    [ "🧭 Coord. de Estágio", r.coordenadorEstagio || "" ]
  ].filter(([ , v ]) => v);
  if (!linhas.length) return "";
  return `<div style="border:1px solid var(--cinza-borda);border-radius:10px;overflow:hidden;background:#fff;">` +
    linhas.map(([ label, valor ], i) => `\n    <div style="display:flex;gap:10px;padding:8px 14px;min-height:38px;box-sizing:border-box;${i < linhas.length - 1 ? "border-bottom:1px solid var(--cinza-borda);" : ""}">\n      <span style="flex:0 0 140px;display:flex;align-items:center;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--roxo);">${label}</span>\n      <span style="flex:1;display:flex;align-items:center;font-size:13px;line-height:1.35;color:var(--texto);">${valor}</span>\n    </div>`).join("") + `\n  </div>`;
    linhas.map(([ label, valor ], i) => `\n    <div style="display:flex;gap:10px;padding:4px 14px;min-height:auto;box-sizing:border-box;${i < linhas.length - 1 ? "border-bottom:1px solid var(--cinza-borda);" : ""}">\n      <span style="flex:0 0 170px;display:flex;align-items:center;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--roxo);">${label}</span>\n      <span style="flex:1;display:flex;align-items:center;font-size:13px;line-height:1.35;color:var(--texto);">${valor}</span>\n    </div>`).join("") + `\n  </div>`;
}

// Renderiza uma lista de pares [rótulo, valor] como uma caixa de linhas, pulando valores vazios.
function flCamposBox(pares) {
  const linhas = (pares || []).filter(([ , v ]) => v !== undefined && v !== null && String(v).trim() !== "");
  if (!linhas.length) return "";
  return `<div style="border:1px solid var(--cinza-borda);border-radius:10px;overflow:hidden;background:#fff;">` +
    linhas.map(([ label, valor ], i) => `\n    <div style="display:flex;gap:10px;padding:8px 14px;min-height:38px;box-sizing:border-box;${i < linhas.length - 1 ? "border-bottom:1px solid var(--cinza-borda);" : ""}">\n      <span style="flex:0 0 170px;display:flex;align-items:center;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--roxo);">${escapeHtmlRegra(String(label))}</span>\n      <span style="flex:1;display:flex;align-items:center;font-size:13px;line-height:1.35;color:var(--texto);white-space:pre-line;">${String(valor)}</span>\n    </div>`).join("") + `\n  </div>`;
    linhas.map(([ label, valor ], i) => `\n    <div style="display:flex;gap:10px;padding:4px 14px;min-height:auto;box-sizing:border-box;${i < linhas.length - 1 ? "border-bottom:1px solid var(--cinza-borda);" : ""}">\n      <span style="flex:0 0 170px;display:flex;align-items:center;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--roxo);">${escapeHtmlRegra(String(label))}</span>\n      <span style="flex:1;display:flex;align-items:center;font-size:13px;line-height:1.35;color:var(--texto);white-space:pre-line;">${String(valor)}</span>\n    </div>`).join("") + `\n  </div>`;
}

// Campos "simples" (texto curto) da Fundamentação Legal e dos Dados do Curso.
@@ -85,7 +85,7 @@
    ...CAMPOS_FUNDAMENTACAO.map(f => [ f.label, dados[f.key] ])
  ]);
  const delBtn = tipo => adminMode ? `<button class="admin-danger-btn" style="padding:2px 8px;font-size:11px;margin-left:8px;" onclick="excluirBlocoEstado('${uf}','${tipo}')" title="Excluir este bloco">🗑️</button>` : "";
  pane.innerHTML = `\n        <div class="port-detail-header">\n          <div class="port-detail-title">${estado.nome} (${uf})</div>\n          ${dados.statusLabel ? `<div class="port-status-badge port-status-${dados.status}">${dados.statusLabel}${delBtn("situacao")}</div>` : ""}\n        </div>\n        ${fundamentacaoBox ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Fundamentação Legal</span>${delBtn("fundamentacao")}</div>\n          <div class="port-section-text">${fundamentacaoBox}</div>\n        </div>` : ""}\n        ${dados.fundamentacaoLegal ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Fundamentação Legal (texto livre)</span>${delBtn("fundamentacaoLivre")}</div>\n          <div class="port-section-text">${dados.fundamentacaoLegal}</div>\n        </div>` : ""}\n        ${dados.responsaveis ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Secretário, Diretor e Coordenadores Responsáveis</span>${delBtn("responsaveis")}</div>\n          <div class="port-section-text">${flResponsaveis(dados.responsaveis)}</div>\n        </div>` : ""}\n        ${dados.observacoes ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Observações</span>${delBtn("observacoes")}</div>\n          <div class="port-section-text">${dados.observacoes}</div>\n        </div>` : ""}\n        ${dados.portarias && dados.portarias.length ? `\n        <div class="port-section">\n          <div class="port-section-title">Portarias e Documentos</div>\n          ${docsHtml}\n        </div>` : ""}\n        ${adminMode ? `\n        <div style="display:flex;flex-direction:column;gap:10px;margin:22px auto 0;max-width:320px;">\n          <button class="admin-edit-btn" onclick="abrirFormularioEstadoCompleto('${uf}')">✏️ Editar todos os dados</button>\n          <button class="admin-dashed-btn" onclick="criarBlocoEstado('${uf}','unidade')">➕ Unidade de Ensino</button>\n        </div>` : ""}`;
  pane.innerHTML = `\n        <div class="port-detail-header">\n          <div class="port-detail-title">${estado.nome} (${uf})</div>\n          ${dados.statusLabel ? `<div class="port-status-badge port-status-${dados.status}">${dados.statusLabel}${delBtn("situacao")}</div>` : ""}\n        </div>\n        ${fundamentacaoBox ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Fundamentação Legal</span>${delBtn("fundamentacao")}</div>\n          <div class="port-section-text">${fundamentacaoBox}</div>\n        </div>` : ""}\n        ${dados.fundamentacaoLegal ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Fundamentação Legal</span>${delBtn("fundamentacaoLivre")}</div>\n          <div class="port-section-text">${dados.fundamentacaoLegal}</div>\n        </div>` : ""}\n        ${dados.responsaveis ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Secretário, Diretor e Coordenadores Responsáveis</span>${delBtn("responsaveis")}</div>\n          <div class="port-section-text">${flResponsaveis(dados.responsaveis)}</div>\n        </div>` : ""}\n        ${dados.observacoes ? `\n        <div class="port-section">\n          <div class="port-section-title" style="display:flex;align-items:center;"><span style="flex:1;">Observações</span>${delBtn("observacoes")}</div>\n          <div class="port-section-text">${dados.observacoes}</div>\n        </div>` : ""}\n        ${dados.portarias && dados.portarias.length ? `\n        <div class="port-section">\n          <div class="port-section-title">Portarias e Documentos</div>\n          ${docsHtml}\n        </div>` : ""}\n        ${adminMode ? `\n        <div style="display:flex;flex-direction:column;gap:10px;margin:22px auto 0;max-width:320px;">\n          <button class="admin-edit-btn" onclick="abrirFormularioEstadoCompleto('${uf}')">✏️ Editar todos os dados</button>\n          <button class="admin-dashed-btn" onclick="criarBlocoEstado('${uf}','unidade')">➕ Unidade de Ensino</button>\n        </div>` : ""}`;
}

// Adiciona botões de editar/excluir na ficha do estado quando o modo admin está ativo
@@ -110,7 +110,7 @@
    const titulo = sec.querySelector(".port-section-title");
    if (!titulo) return;
    const rotulo = (titulo.querySelector("span") || titulo).textContent.trim();
    if (rotulo === "Fundamentação Legal (texto livre)") {
    if (rotulo === "Fundamentação Legal") {
      const btn = document.createElement("button");
      btn.className = "admin-edit-btn";
      btn.style.marginLeft = "10px";
@@ -136,7 +136,7 @@
      portariaDiretor: ""
    };
  } else if (tipo === "unidade") {
    dados.fundamentacaoLegal = (dados.fundamentacaoLegal || "") + flUnidade("Unidade de Ensino", flRow("Parecer", "Preencha aqui o parecer da unidade") + flRow("Portaria", "Preencha aqui a portaria"), []);
    dados.fundamentacaoLegal = (dados.fundamentacaoLegal || "") + flUnidade("Unidade de Ensino", flRow("Credenciamento - Sede ", "Preencha aqui o parecer da unidade") + flRow("Credenciamento - Polo", "Preencha aqui a portaria"), []);
  }
  const resultado = await resyncDataBlock("portarias", PORTARIAS_DATA);
  selectEstado(uf);
@@ -243,7 +243,7 @@
const NOMES_BLOCO_PORTARIA = {
  situacao: "Situação (status)",
  fundamentacao: "Fundamentação Legal",
  fundamentacaoLivre: "Fundamentação Legal (texto livre)",
  fundamentacaoLivre: "Fundamentação Legal",
  responsaveis: "Secretário, Diretor e Coordenadores Responsáveis",
  observacoes: "Observações"
}
