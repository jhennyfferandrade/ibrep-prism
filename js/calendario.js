/**
 * IBREP Prism — Módulo: Calendário
 * ---------------------------------
 * Tudo que é específico da tela "Calendário" (eventos, grade do mês,
 * modal de novo/editar evento) mora aqui.
 *
 * Este arquivo é carregado de forma "eager" (normal <script src>) no
 * index.html, ANTES do script principal (app-main-script). Isso é
 * necessário porque `aplicarDadosSalvos()`, lá no script principal,
 * já espera encontrar `CALENDARIO_EVENTOS` pronto para preencher com
 * os dados vindos da nuvem/localStorage assim que a página carrega —
 * mesmo que o usuário nunca clique no botão "Calendário".
 *
 * Ou seja: o HTML da tela (telas/calendario.html) É carregado sob
 * demanda (só quando o usuário clica), mas o JS (este arquivo) é
 * carregado sempre, para os dados ficarem sincronizados em segundo
 * plano. Isso é o mesmo padrão usado por qualquer outra função nova
 * que você adicionar.
 */

const CALENDARIO_EVENTOS = {};

function calHashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

const CAL_PALETA = [
  { bg: "#efeaff", borda: "#7c5cff" }, // roxo
  { bg: "#e3f2fd", borda: "#1e88e5" }, // azul
  { bg: "#e8f5e9", borda: "#43a047" }, // verde
  { bg: "#fff3e0", borda: "#fb8c00" }, // laranja
  { bg: "#fce4ec", borda: "#e91e63" }, // rosa
  { bg: "#fffde7", borda: "#c9a300" }, // amarelo
  { bg: "#e0f7fa", borda: "#00acc1" }, // ciano
  { bg: "#ffebee", borda: "#e53935" }, // vermelho
  { bg: "#e8eaf6", borda: "#3949ab" }, // índigo
  { bg: "#e0f2f1", borda: "#00897b" }  // verde-água
];

function calCorEvento(id) {
  const idx = calHashId(String(id)) % CAL_PALETA.length;
  return CAL_PALETA[idx];
}

// Chave usada em sessionStorage para lembrar em qual mês do calendário o
// usuário estava, mas SOMENTE para o caso de um recarregamento de página
// (F5) enquanto ele ainda está dentro da tela "Calendário". Assim que o
// usuário sai da tela (navega para outra área), essa chave é apagada por
// calResetParaMesAtual() — então, na próxima vez que ele entrar no
// calendário (sem recarregar a página), o mês volta a ser o atual.
const CAL_SESSAO_MES_KEY = "ibrep_cal_mes_sessao";

function calMesComoChave(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function calRestaurarMesInicial() {
  try {
    const telaSalva = sessionStorage.getItem("ibrep_tela_atual");
    const mesSalvo = sessionStorage.getItem(CAL_SESSAO_MES_KEY);
    if (telaSalva === "calendario" && mesSalvo) {
      const [ ano, mes ] = mesSalvo.split("-").map(Number);
      if (ano && mes) return new Date(ano, mes - 1, 1);
    }
  } catch (e) {}
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
}

function calPersistirMesNaSessao() {
  try {
    sessionStorage.setItem(CAL_SESSAO_MES_KEY, calMesComoChave(CAL_MES_ATUAL));
  } catch (e) {}
}

// Chamada por irParaTela() (index.html) sempre que o usuário sai da tela
// "Calendário" para ir a qualquer outra área do sistema.
function calResetParaMesAtual() {
  const hoje = new Date();
  CAL_MES_ATUAL = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  try {
    sessionStorage.removeItem(CAL_SESSAO_MES_KEY);
  } catch (e) {}
}

let CAL_MES_ATUAL = calRestaurarMesInicial();

let calEditando = { data: null, id: null };

function openCalendario() {
  if (!exigirPermissao("calendario")) return;
  irParaTela("calendario");
}

// ===================== CALENDÁRIO =====================

function calFormatarData(d) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function calCodificarQuebras(txt) {
  return (txt || "").replace(/\r\n/g, "\n").replace(/\n/g, "\u2424"); // ␤
}
function calDecodificarQuebras(txt) {
  return (txt || "").replace(/\u2424/g, "\n");
}

// Modo de visualização escolhido pelo usuário nesta sessão: "grid"
// (calendário em grade) ou "linear" (só a lista de eventos). Fica
// independente da permissão de edição — qualquer pessoa pode alternar
// entre as duas visões.
let CAL_MODO_VISUALIZACAO = null;

const CAL_SESSAO_MODO_KEY = "ibrep_cal_modo_visualizacao";

function calModoInicial() {
  try {
    const salvo = sessionStorage.getItem(CAL_SESSAO_MODO_KEY);
    if (salvo === "grid" || salvo === "linear") return salvo;
  } catch (e) {}
  // Sem preferência salva ainda: quem edita começa vendo a grade, quem
  // só visualiza começa vendo a lista — mas os dois podem trocar.
  return podeEditarCalendario() ? "grid" : "linear";
}

function calAlternarVisualizacao(modo) {
  CAL_MODO_VISUALIZACAO = modo;
  try { sessionStorage.setItem(CAL_SESSAO_MODO_KEY, modo); } catch (e) {}
  calRenderMes();
}

function initCalendarioScreen() {
  calRenderMes();
}

function calMudarMes(delta) {
  CAL_MES_ATUAL = new Date(CAL_MES_ATUAL.getFullYear(), CAL_MES_ATUAL.getMonth() + delta, 1);
  calRenderMes();
}

function calIrParaHoje() {
  const hoje = new Date();
  CAL_MES_ATUAL = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  calRenderMes();
}

function calRenderMes() {
  calPersistirMesNaSessao();
  const ano = CAL_MES_ATUAL.getFullYear();
  const mes = CAL_MES_ATUAL.getMonth();
  const nomesMeses = [ "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro" ];
  const tituloEl = document.getElementById("cal-titulo-mes");
  if (tituloEl) tituloEl.textContent = `${nomesMeses[mes]} de ${ano}`;

  const editavel = podeEditarCalendario();
  const btnNovo = document.getElementById("cal-btn-novo-evento");
  const badgeVer = document.getElementById("cal-viewonly-badge");
  if (btnNovo) btnNovo.style.display = editavel ? "" : "none";
  if (badgeVer) badgeVer.style.display = editavel ? "none" : "";

  if (!CAL_MODO_VISUALIZACAO) CAL_MODO_VISUALIZACAO = calModoInicial();
  document.getElementById("cal-toggle-grid")?.classList.toggle("active", CAL_MODO_VISUALIZACAO === "grid");
  document.getElementById("cal-toggle-linear")?.classList.toggle("active", CAL_MODO_VISUALIZACAO === "linear");

  const gridWrap = document.getElementById("cal-grid-wrap");
  const linearWrap = document.getElementById("cal-linear-wrap");

  if (CAL_MODO_VISUALIZACAO === "grid") {
    if (gridWrap) gridWrap.style.display = "";
    if (linearWrap) linearWrap.style.display = "none";
    calRenderGrid(ano, mes);
  } else {
    if (gridWrap) gridWrap.style.display = "none";
    if (linearWrap) linearWrap.style.display = "";
    calRenderLinear(ano, mes);
  }
}

function calRenderGrid(ano, mes) {
  const editavel = podeEditarCalendario();
  const hojeStr = calFormatarData(new Date());
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const diasMesAnterior = new Date(ano, mes, 0).getDate();

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) {
    const dia = diasMesAnterior - primeiroDiaSemana + 1 + i;
    celulas.push({ dataObj: new Date(ano, mes - 1, dia), outroMes: true });
  }
  for (let d = 1; d <= diasNoMes; d++) {
    celulas.push({ dataObj: new Date(ano, mes, d), outroMes: false });
  }
  let proximoDia = 1;
  while (celulas.length % 7 !== 0) {
    celulas.push({ dataObj: new Date(ano, mes + 1, proximoDia), outroMes: true });
    proximoDia++;
  }

  let html = "";
  for (let w = 0; w < celulas.length; w += 7) {
    html += `<div class="cal-week-row">`;
    for (let i = w; i < w + 7; i++) {
      const c = celulas[i];
      const dataStr = calFormatarData(c.dataObj);
      const eventos = (CALENDARIO_EVENTOS[dataStr] || []).slice().sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"));
      const classes = [ "cal-day-cell" ];
      if (c.outroMes) classes.push("cal-outro-mes");
      if (dataStr === hojeStr) classes.push("cal-hoje");
      if (editavel) classes.push("cal-editavel");
      const addBtn = editavel ? `<span class="cal-day-add" onclick="event.stopPropagation();calAbrirNovoEvento('${dataStr}')" title="Adicionar evento">➕</span>` : "";
      const eventosHtml = eventos.map(ev => {
        const cor = calCorEvento(ev.id);
        const delBtn = editavel ? `<span class="cal-evento-del" onclick="event.stopPropagation();calExcluirEvento('${dataStr}','${ev.id}')" title="Excluir evento">🗑️</span>` : "";
        const horaHtml = ev.diaTodo
          ? `<span class="cal-evento-hora" style="color:${cor.borda};">Dia todo</span>`
          : (ev.hora ? `<span class="cal-evento-hora" style="color:${cor.borda};">${escapeHtmlRegra(ev.hora)}</span>` : "");
        const descHtml = ev.desc ? `<div class="cal-evento-desc">${escapeHtmlRegra(ev.desc)}</div>` : "";
        const cliqueEvento = editavel
          ? `calAbrirNovoEvento('${dataStr}','${ev.id}')`
          : `calAbrirVisualizacaoEvento('${dataStr}','${ev.id}')`;
        return `<div class="cal-evento cal-editavel" style="background:${cor.bg};border-left-color:${cor.borda}; border-radius:10px;" onclick="event.stopPropagation();${cliqueEvento}">
          <div class="cal-evento-linha">${horaHtml}<span>${escapeHtmlRegra(ev.titulo)}</span>${delBtn}</div>
          ${descHtml}
        </div>`;
      }).join("");
      const cellClick = editavel ? ` onclick="calAbrirNovoEvento('${dataStr}')"` : "";
      html += `<div class="${classes.join(" ")}"${cellClick}>
        <div class="cal-day-num-row"><span class="cal-day-num">${c.dataObj.getDate()}</span>${addBtn}</div>
        ${eventosHtml}
      </div>`;
    }
    html += `</div>`;
  }
  const cont = document.getElementById("cal-weeks");
  if (cont) cont.innerHTML = html;
}

// Visão "somente visualização": lista linear (sem grade/tabela) com os
// eventos do mês selecionado, um dia embaixo do outro, do jeito mais
// simples e bonito possível — sem colunas de data/hora separadas.
function calRenderLinear(ano, mes) {
  const cont = document.getElementById("cal-linear-list");
  if (!cont) return;

  const editavel = podeEditarCalendario();
  const nomesDiaSemana = [ "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb" ];
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const hojeStr = calFormatarData(new Date());

  let html = "";
  let temEvento = false;

  for (let d = 1; d <= diasNoMes; d++) {
    const dataObj = new Date(ano, mes, d);
    const dataStr = calFormatarData(dataObj);
    const eventos = (CALENDARIO_EVENTOS[dataStr] || []).slice().sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"));
    if (eventos.length === 0) continue;
    temEvento = true;

    const eventosHtml = eventos.map(ev => {
      const cor = calCorEvento(ev.id);
      const horaHtml = ev.diaTodo
        ? `<span class="cal-linear-event-time" style="color:${cor.borda};">Dia todo</span>`
        : (ev.hora ? `<span class="cal-linear-event-time" style="color:${cor.borda};">${escapeHtmlRegra(ev.hora)}</span>` : "");
      const descHtml = ev.desc ? `<div class="cal-linear-event-desc">${escapeHtmlRegra(ev.desc)}</div>` : "";
      const cliqueEvento = editavel
        ? `calAbrirNovoEvento('${dataStr}','${ev.id}')`
        : `calAbrirVisualizacaoEvento('${dataStr}','${ev.id}')`;
      return `<div class="cal-linear-event" style="background:${cor.bg};border-left-color:${cor.borda};" onclick="${cliqueEvento}">
          <div class="cal-linear-event-top">${horaHtml}<span class="cal-linear-event-title">${escapeHtmlRegra(ev.titulo)}</span></div>
          ${descHtml}
        </div>`;
    }).join("");

    html += `<div class="cal-linear-day ${dataStr === hojeStr ? "cal-linear-hoje" : ""}">
        <div class="cal-linear-date">
          <span class="cal-linear-daynum">${d}</span>
          <span class="cal-linear-weekday">${nomesDiaSemana[dataObj.getDay()]}</span>
        </div>
        <div class="cal-linear-events">${eventosHtml}</div>
      </div>`;
  }

  cont.innerHTML = temEvento ? html : `<div class="cal-linear-empty">📅 Nenhum evento cadastrado neste mês</div>`;
}

// Cartão de visualização (somente leitura) de um evento — mostra só
// título, data, horário/dia todo e descrição, sem o layout do editor.
function calAbrirVisualizacaoEvento(dataStr, id) {
  const lista = CALENDARIO_EVENTOS[dataStr] || [];
  const ev = lista.find(e => e.id === id);
  if (!ev) return;

  const cor = calCorEvento(ev.id);
  const [ y, m, d ] = dataStr.split("-").map(Number);
  const dataObj = new Date(y, m - 1, d);
  const nomesDiaSemana = [ "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado" ];
  const nomesMeses = [ "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro" ];
  const dataFormatada = `${d} de ${nomesMeses[m - 1]} de ${y} · ${nomesDiaSemana[dataObj.getDay()]}`;
  const horaFormatada = ev.diaTodo ? "Dia todo" : (ev.hora ? ev.hora : "Sem horário definido");

  document.getElementById("cal-view-data").textContent = dataFormatada;
  document.getElementById("cal-view-titulo").textContent = ev.titulo;
  document.getElementById("cal-view-hora").textContent = horaFormatada;
  const descEl = document.getElementById("cal-view-desc");
  descEl.textContent = ev.desc || "";
  descEl.style.display = ev.desc ? "" : "none";

  const card = document.getElementById("cal-evento-view-card");
  if (card) card.style.setProperty("--cal-view-cor", cor.borda);
  document.getElementById("cal-evento-view-overlay").classList.add("open");
}

function calFecharVisualizacaoEvento() {
  document.getElementById("cal-evento-view-overlay")?.classList.remove("open");
}

function calAbrirNovoEvento(dataStr, id) {
  const editavel = podeEditarCalendario();
  if (!id && !editavel) return;
  calEditando = { data: dataStr, id: id || null };
  const lista = CALENDARIO_EVENTOS[dataStr] || [];
  const ev = id ? lista.find(e => e.id === id) : null;

  document.getElementById("cal-evento-card-titulo").textContent = ev ? (editavel ? "Editar evento" : "Detalhes do evento") : "Novo evento";
  document.getElementById("cal-form-data").value = dataStr;
  document.getElementById("cal-form-dia-todo").checked = ev ? !!ev.diaTodo : false;
  document.getElementById("cal-form-hora").value = ev ? (ev.hora || "") : "";
  document.getElementById("cal-form-titulo").value = ev ? ev.titulo : "";
  document.getElementById("cal-form-desc").value = ev ? (ev.desc || "") : "";
  [ "cal-form-data", "cal-form-dia-todo", "cal-form-hora", "cal-form-titulo", "cal-form-desc" ].forEach(idEl => {
    document.getElementById(idEl).disabled = !editavel;
  });
  calToggleDiaTodo();
  document.getElementById("cal-btn-excluir-evento").style.display = (ev && editavel) ? "" : "none";
  document.getElementById("cal-btn-salvar-evento").style.display = editavel ? "" : "none";
  document.getElementById("cal-btn-cancelar-evento").textContent = editavel ? "Cancelar" : "Fechar";
  document.getElementById("cal-evento-overlay").classList.add("open");
  setTimeout(() => {
    const campo = editavel ? document.getElementById("cal-form-titulo") : document.getElementById("cal-btn-cancelar-evento");
    if (campo) campo.focus();
  }, 50);
}

function calToggleDiaTodo() {
  const diaTodo = document.getElementById("cal-form-dia-todo").checked;
  const campoHora = document.getElementById("cal-form-hora");
  if (diaTodo) {
    campoHora.value = "";
    campoHora.disabled = true;
  } else if (podeEditarCalendario()) {
    campoHora.disabled = false;
  }
}

function calFecharModalEvento() {
  document.getElementById("cal-evento-overlay").classList.remove("open");
  calEditando = { data: null, id: null };
}

function calCacheLocal() {
  try {
    localStorage.setItem(LS_PREFIX + "calendario", JSON.stringify(CALENDARIO_EVENTOS));
  } catch (e) {
    console.warn("Não foi possível salvar o cache local do calendário:", e);
  }
  ULTIMO_SALVAMENTO_LOCAL["calendario"] = Date.now();
}

async function calPersistirEvento(evento, dataStr) {
  calCacheLocal();
  try {
    const data = await supabaseRpc("salvar_evento_calendario", {
      p_user_id: currentUser ? currentUser.id : null,
      p_id: evento.id,
      p_data: dataStr,
      p_hora: evento.hora || null,
      p_dia_todo: !!evento.diaTodo,
      p_titulo: evento.titulo,
       p_descricao: evento.desc ? calCodificarQuebras(evento.desc) : null   // 👈 mudou aqui
    });
    if (!data.ok) {
      alert("⚠️ O evento foi salvo apenas neste navegador — falha ao sincronizar com o banco de dados: " + (data.erro || ""));
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Supabase: falha ao salvar evento do calendário na nuvem.", e);
    alert("⚠️ O evento foi salvo apenas neste navegador — houve uma falha ao sincronizar com o banco de dados.");
    return false;
  }
}

async function calPersistirExclusao(id) {
  calCacheLocal();
  try {
    const data = await supabaseRpc("excluir_evento_calendario", {
      p_user_id: currentUser ? currentUser.id : null,
      p_id: id
    });
    if (!data.ok) {
      alert("⚠️ O evento foi removido apenas neste navegador — falha ao sincronizar com o banco de dados: " + (data.erro || ""));
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Supabase: falha ao excluir evento do calendário na nuvem.", e);
    alert("⚠️ O evento foi removido apenas neste navegador — houve uma falha ao sincronizar com o banco de dados.");
    return false;
  }
}

function calSalvarEvento() {
  if (!podeEditarCalendario()) return;
  const dataStr = document.getElementById("cal-form-data").value;
  const diaTodo = document.getElementById("cal-form-dia-todo").checked;
  const hora = diaTodo ? "" : document.getElementById("cal-form-hora").value.trim();
  const titulo = document.getElementById("cal-form-titulo").value.trim();
  const desc = document.getElementById("cal-form-desc").value.trim();
  if (!dataStr || !titulo) {
    alert("Preencha ao menos a data e o título do evento.");
    return;
  }
  if (!CALENDARIO_EVENTOS[dataStr]) CALENDARIO_EVENTOS[dataStr] = [];

  let eventoSalvo;
  if (calEditando.id) {
    eventoSalvo = { id: calEditando.id, hora, diaTodo, titulo, desc };
    if (calEditando.data && calEditando.data !== dataStr) {
      const listaAntiga = CALENDARIO_EVENTOS[calEditando.data] || [];
      const idx = listaAntiga.findIndex(e => e.id === calEditando.id);
      if (idx > -1) listaAntiga.splice(idx, 1);
      if (listaAntiga.length === 0) delete CALENDARIO_EVENTOS[calEditando.data];
      CALENDARIO_EVENTOS[dataStr].push(eventoSalvo);
    } else {
      const lista = CALENDARIO_EVENTOS[dataStr];
      const idx = lista.findIndex(e => e.id === calEditando.id);
      if (idx > -1) lista[idx] = eventoSalvo;
    }
  } else {
    eventoSalvo = { id: "ev" + Date.now() + Math.floor(Math.random() * 1000), hora, diaTodo, titulo, desc };
    CALENDARIO_EVENTOS[dataStr].push(eventoSalvo);
  }

  calPersistirEvento(eventoSalvo, dataStr);
  const [ y, m ] = dataStr.split("-").map(Number);
  CAL_MES_ATUAL = new Date(y, m - 1, 1);
  calFecharModalEvento();
  calRenderMes();
}

function calExcluirEvento(dataStr, id) {
  if (!podeEditarCalendario()) return;
  if (!confirm("Excluir este evento?")) return;
  const lista = CALENDARIO_EVENTOS[dataStr] || [];
  const idx = lista.findIndex(e => e.id === id);
  if (idx > -1) lista.splice(idx, 1);
  if (lista.length === 0) delete CALENDARIO_EVENTOS[dataStr];
  calPersistirExclusao(id);
  calRenderMes();
}

function calExcluirEventoAtual() {
  if (!calEditando.id) return;
  if (!confirm("Excluir este evento?")) return;
  const lista = CALENDARIO_EVENTOS[calEditando.data] || [];
  const idx = lista.findIndex(e => e.id === calEditando.id);
  if (idx > -1) lista.splice(idx, 1);
  if (lista.length === 0) delete CALENDARIO_EVENTOS[calEditando.data];
  const idExcluido = calEditando.id;
  calPersistirExclusao(idExcluido);
  calFecharModalEvento();
  calRenderMes();
}
