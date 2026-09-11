/**
 * IBREP Prism — Módulo: Comparativo de Estados
 * -----------------------------------------------
 * Tudo que é específico da tabela comparativa entre estados/planos.
 *
 * Carregado de forma "eager" (normal <script src>) no index.html, porque
 * `aplicarDadosSalvos()` já espera encontrar `COMPARATIVO_DATA` pronto
 * assim que a página carrega. O HTML da tela (telas/comparativo.html) é
 * que é carregado sob demanda, só quando o usuário clica no botão.
 */

const COMPARATIVO_DATA = {
  cols: [],
  rows: []
};

function openComparativo() {
  if (!exigirPermissao("comparativo")) return;
  irParaTela("comparativo");
  aplicarEdicaoComparativo();
}

function renderComparativoTable() {
  const table = document.getElementById("comp-table");
  if (!table) return;
  let thead = `<tr><th class="comp-row-label" style="background:#5a5e78;">Característica</th>`;
  COMPARATIVO_DATA.cols.forEach((col, colIdx) => {
    const delBtn = adminMode ? `<span class="comp-col-del" data-del-col="${col.id}" title="Excluir coluna">🗑️</span>` : "";
    const moveBtns = adminMode ? `<span class="comp-col-move-group">\n               <span class="comp-col-move ${colIdx === 0 ? "disabled" : ""}" data-move-col-left="${col.id}" title="Mover coluna para a esquerda">◀️</span>\n               <span class="comp-col-move ${colIdx === COMPARATIVO_DATA.cols.length - 1 ? "disabled" : ""}" data-move-col-right="${col.id}" title="Mover coluna para a direita">▶️</span>\n             </span>` : "";
    thead += `\n          <th class="comp-col-head ${col.tti360 ? "tti360" : ""}">\n            ${moveBtns}\n            <div class="comp-col-head-inner" ${adminMode ? 'contenteditable="true"' : ""} data-comp-col="${col.id}">${col.html}</div>\n            ${delBtn}\n          </th>`;
  });
  thead += `</tr>`;
  let tbody = "";
  COMPARATIVO_DATA.rows.forEach((row, rowIdx) => {
    const delBtn = adminMode ? `<span class="comp-row-del" data-del-row="${row.id}" title="Excluir linha">🗑️</span>` : "";
    const moveBtns = adminMode ? `<span class="comp-row-move-group">\n               <span class="comp-row-move ${rowIdx === 0 ? "disabled" : ""}" data-move-row-up="${row.id}" title="Mover linha para cima">🔼</span>\n               <span class="comp-row-move ${rowIdx === COMPARATIVO_DATA.rows.length - 1 ? "disabled" : ""}" data-move-row-down="${row.id}" title="Mover linha para baixo">🔽</span>\n             </span>` : "";
    tbody += `<tr>\n          <td class="comp-row-label">\n            ${moveBtns}\n            <span class="comp-row-icon">${row.icon || ""}</span>\n            <span ${adminMode ? 'contenteditable="true"' : ""} data-comp-rowlabel="${row.id}">${escapeHtmlRegra(row.label)}</span>\n            ${delBtn}\n          </td>`;
    COMPARATIVO_DATA.cols.forEach(col => {
      const val = row.cells[col.id] !== undefined ? row.cells[col.id] : "—";
      tbody += `<td class="comp-cell ${col.tti360 ? "tti360" : ""} ${adminMode ? "admin-editable" : ""}"\n            ${adminMode ? 'contenteditable="true"' : ""} data-comp-row="${row.id}" data-comp-col="${col.id}">${val}</td>`;
    });
    tbody += `</tr>`;
  });
  table.innerHTML = `<thead>${thead}</thead><tbody>${tbody}</tbody>`;
  wireComparativoEditing();
}

function wireComparativoEditing() {
  if (!adminMode) return;
  const table = document.getElementById("comp-table");
  table.querySelectorAll("[data-comp-row][data-comp-col]").forEach(td => {
    td.addEventListener("blur", () => {
      const row = COMPARATIVO_DATA.rows.find(r => r.id === td.dataset.compRow);
      if (!row) return;
      row.cells[td.dataset.compCol] = td.innerHTML.trim();
      resyncDataBlock("comparativo", COMPARATIVO_DATA);
      mostrarFlashSalvo(td);
    });
  });
  table.querySelectorAll("[data-comp-col]:not([data-comp-row])").forEach(el => {
    el.addEventListener("blur", () => {
      const col = COMPARATIVO_DATA.cols.find(c => c.id === el.dataset.compCol);
      if (!col) return;
      col.html = el.innerHTML.trim();
      resyncDataBlock("comparativo", COMPARATIVO_DATA);
      mostrarFlashSalvo(el);
    });
  });
  table.querySelectorAll("[data-comp-rowlabel]").forEach(el => {
    el.addEventListener("blur", () => {
      const rowId = el.getAttribute("data-comp-rowlabel");
      const row = COMPARATIVO_DATA.rows.find(r => r.id === rowId);
      if (!row) return;
      row.label = el.textContent.trim();
      resyncDataBlock("comparativo", COMPARATIVO_DATA);
      mostrarFlashSalvo(el);
    });
  });
  table.querySelectorAll("[data-del-col]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      excluirColunaComparativo(el.getAttribute("data-del-col"));
    });
  });
  table.querySelectorAll("[data-del-row]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      excluirLinhaComparativo(el.getAttribute("data-del-row"));
    });
  });
  table.querySelectorAll("[data-move-col-left]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      moverColunaComparativo(el.getAttribute("data-move-col-left"), -1);
    });
  });
  table.querySelectorAll("[data-move-col-right]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      moverColunaComparativo(el.getAttribute("data-move-col-right"), 1);
    });
  });
  table.querySelectorAll("[data-move-row-up]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      moverLinhaComparativo(el.getAttribute("data-move-row-up"), -1);
    });
  });
  table.querySelectorAll("[data-move-row-down]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      moverLinhaComparativo(el.getAttribute("data-move-row-down"), 1);
    });
  });
}

function moverColunaComparativo(id, direcao) {
  const idx = COMPARATIVO_DATA.cols.findIndex(c => c.id === id);
  if (idx === -1) return;
  const novoIdx = idx + direcao;
  if (novoIdx < 0 || novoIdx >= COMPARATIVO_DATA.cols.length) return;
  const cols = COMPARATIVO_DATA.cols;
  [cols[idx], cols[novoIdx]] = [ cols[novoIdx], cols[idx] ];
  resyncDataBlock("comparativo", COMPARATIVO_DATA);
  renderComparativoTable();
}

function moverLinhaComparativo(id, direcao) {
  const idx = COMPARATIVO_DATA.rows.findIndex(r => r.id === id);
  if (idx === -1) return;
  const novoIdx = idx + direcao;
  if (novoIdx < 0 || novoIdx >= COMPARATIVO_DATA.rows.length) return;
  const rows = COMPARATIVO_DATA.rows;
  [rows[idx], rows[novoIdx]] = [ rows[novoIdx], rows[idx] ];
  resyncDataBlock("comparativo", COMPARATIVO_DATA);
  renderComparativoTable();
}

function adicionarLinhaComparativo() {
  const nome = prompt("Nome da nova característica (linha):", "Nova característica");
  if (nome === null) return;
  const id = "row-" + Date.now();
  const cells = {};
  COMPARATIVO_DATA.cols.forEach(c => {
    cells[c.id] = "—";
  });
  COMPARATIVO_DATA.rows.push({
    id: id,
    icon: "✳️",
    label: nome.trim() || "Nova característica",
    cells: cells
  });
  resyncDataBlock("comparativo", COMPARATIVO_DATA);
  renderComparativoTable();
}

function adicionarColunaComparativo() {
  const nome = prompt("Nome do novo estado/plano (coluna):", "Novo estado");
  if (nome === null) return;
  const id = "col-" + Date.now();
  COMPARATIVO_DATA.cols.push({
    id: id,
    html: nome.trim() || "Novo estado",
    tti360: false
  });
  COMPARATIVO_DATA.rows.forEach(r => {
    r.cells[id] = "—";
  });
  resyncDataBlock("comparativo", COMPARATIVO_DATA);
  renderComparativoTable();
}

function excluirLinhaComparativo(id) {
  const row = COMPARATIVO_DATA.rows.find(r => r.id === id);
  if (!row) return;
  if (!confirm(`Excluir a linha "${row.label}"?`)) return;
  COMPARATIVO_DATA.rows = COMPARATIVO_DATA.rows.filter(r => r.id !== id);
  resyncDataBlock("comparativo", COMPARATIVO_DATA);
  renderComparativoTable();
}

function excluirColunaComparativo(id) {
  if (COMPARATIVO_DATA.cols.length <= 1) {
    alert("É preciso manter ao menos uma coluna.");
    return;
  }
  if (!confirm("Excluir esta coluna (estado/plano) da tabela?")) return;
  COMPARATIVO_DATA.cols = COMPARATIVO_DATA.cols.filter(c => c.id !== id);
  COMPARATIVO_DATA.rows.forEach(r => {
    delete r.cells[id];
  });
  resyncDataBlock("comparativo", COMPARATIVO_DATA);
  renderComparativoTable();
}

function aplicarEdicaoComparativo() {
  renderComparativoTable();
}

