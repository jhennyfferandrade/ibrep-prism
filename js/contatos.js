/**
 * IBREP Prism — Módulo: Quem Procurar (contatos)
 * ---------------------------------------------------
 * Mapa de setores (Pedagógico, Financeiro, Comercial, Administrativo…).
 * O layout é o MESMO da tela de Tutoriais: menu de setores à esquerda
 * (.tut-cats/.tut-cat-btn) e o conteúdo do setor selecionado à direita
 * (.tut-content) — reaproveita as classes/CSS de lá de propósito, pra
 * ficar visualmente idêntico.
 *
 * Dentro de cada setor não existem "pessoas com foto" — existem
 * FUNÇÕES/situações (ex.: "Cancelamento", "Matricular pessoas"), cada
 * uma virando o seu próprio "quadradinho" (cont-funcao-card), com o
 * conteúdo completo dela: quando procuram por isso +/**
 * IBREP Prism — Módulo: Quem Procurar (contatos)
 * ---------------------------------------------------
 * Mapa de setores (Pedagógico, Financeiro, Comercial, Administrativo…).
 * O layout é o MESMO da tela de Tutoriais: menu de setores à esquerda
 * (.tut-cats/.tut-cat-btn) e o conteúdo do setor selecionado à direita
 * (.tut-content) — reaproveita as classes/CSS de lá de propósito, pra
 * ficar visualmente idêntico.
 *
 * Dentro de cada setor não existem "pessoas com foto" — existem
 * FUNÇÕES/situações (ex.: "Cancelamento", "Matricular pessoas"), cada
 * uma virando o seu próprio "quadradinho" (cont-funcao-card), com o
 * conteúdo completo dela: quando procuram por isso + quem procurar.
 *
 * Fonte dos dados: tabela contatos_pessoas no Supabase — uma linha por
 * função. Linhas com o mesmo card_id formam um setor só. CONTATOS_PESSOAS
 * (array "achatado") é preenchido por aplicarDadosSalvos()/Realtime, no
 * index.html; aqui a gente só agrupa por card_id para desenhar a tela.
 *
 * Reaproveitamento de colunas existentes da tabela (sem alterar o
 * schema no Supabase):
 *   - emoji / setor / ordem_card → dados do SETOR (compartilhados por
 *     todas as linhas do mesmo card_id).
 *   - titulo        → título da FUNÇÃO (ex.: "Cancelamento").
 *   - caixa_texto1  → "Quando te procuram por isso" DA FUNÇÃO (uma
 *     situação por linha).
 *   - fale_com      → quem procurar / instrução de contato DA FUNÇÃO
 *     (texto livre, ex.: "Procure a Camila").
 *   - caixa_texto2  → aviso/observação opcional DA FUNÇÃO.
 *   - ordem_pessoa  → ordem da função dentro do setor.
 *   - imagem        → foto/ícone opcional da FUNÇÃO (ex.: foto do
 *     responsável). Se não houver foto, mostra um círculo com a
 *     inicial de quem procurar (ou do nome da função).
 */

// Lista "achatada" — uma entrada por função. Fica vazia até o Supabase
// responder (aplicarDadosSalvos()/Realtime, no index.html, populam este
// array) — os dados moram só na tabela contatos_pessoas, não aqui.
let CONTATOS_PESSOAS = [];

let contCategoriaAtual = null;

function openContatos() {
  if (!exigirPermissao("contatos")) return;
  irParaTela("contatos");
}

// Ao entrar na tela, NÃO seleciona nenhum setor automaticamente — fica
// em branco até a pessoa clicar em algum botão do menu. Isso vale tanto
// na primeira entrada quanto depois de sair e voltar (contCategoriaAtual
// é zerado em resetSelecoesTelas() sempre que se volta pro Início).
function initContatosScreen() {
  renderContCats();
  const cards = contatosAgruparEmCards();
  if (contCategoriaAtual && cards.some(c => c.card_id === contCategoriaAtual)) {
    const btn = document.querySelector(`.tut-cat-btn[data-cat="${contCategoriaAtual}"]`);
    setContCat(btn, contCategoriaAtual);
    return;
  }
  const area = document.getElementById("cont-content");
  if (area) {
    area.innerHTML = cards.length
      ? `<div class="cont-empty">👈 Selecione um setor no menu ao lado</div>`
      : `<div class="cont-empty">📂 Nenhum setor cadastrado ainda</div>`;
  }
}

// -------------------------------------------------------------------------
// Agrupamento: transforma a lista achatada de funções em cards por setor
// -------------------------------------------------------------------------
function contatosAgruparEmCards() {
  const porCard = new Map();
  CONTATOS_PESSOAS.forEach(p => {
    if (!porCard.has(p.card_id)) {
      porCard.set(p.card_id, {
        card_id: p.card_id,
        ordem: p.ordem_card || 0,
        icone: p.emoji || "❓",
        setor: p.setor || "",
        funcoes: []
      });
    }
    porCard.get(p.card_id).funcoes.push(p);
  });
  return Array.from(porCard.values()).sort((a, b) => a.ordem - b.ordem);
}

function contatosLinhasDoCard(cardId) {
  return CONTATOS_PESSOAS.filter(p => p.card_id === cardId);
}

// -------------------------------------------------------------------------
// Menu lateral de setores (mesmas classes/CSS de .tut-cats/.tut-cat-btn)
// -------------------------------------------------------------------------
function renderContCats() {
  const cont = document.getElementById("cont-cats-list");
  if (!cont) return;
  const cards = contatosAgruparEmCards();
  let html = "";
  cards.forEach((cat, idx) => {
    const ativo = cat.card_id === contCategoriaAtual ? "active" : "";
    const delBtn = adminMode ? `<span class="tut-cat-del" data-del-cat="${cat.card_id}" title="Excluir setor">🗑️</span>` : "";
    html += `
          <button class="tut-cat-btn ${ativo}" data-cat="${cat.card_id}">
            <span class="tut-cat-icon" data-num="${idx + 1}"></span> ${escapeHtmlRegra(cat.setor)}${delBtn}
          </button>`;
  });
  cont.innerHTML = html;
  cont.querySelectorAll(".tut-cat-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      if (e.target.closest("[data-del-cat]")) return;
      setContCat(btn, btn.getAttribute("data-cat"));
    });
  });
  cont.querySelectorAll("[data-del-cat]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      excluirContCategoria(el.getAttribute("data-del-cat"));
    });
  });
}

function setContCat(btn, cardId) {
  document.querySelectorAll(".tut-cat-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  contCategoriaAtual = cardId;
  renderContContent(cardId);
}

function excluirContCategoria(cardId) {
  const linhas = contatosLinhasDoCard(cardId);
  if (!linhas.length) return;
  if (!confirm(`Excluir o setor "${linhas[0].setor || cardId}" e todas as suas funções? Essa ação não pode ser desfeita.`)) return;
  CONTATOS_PESSOAS = CONTATOS_PESSOAS.filter(p => p.card_id !== cardId);
  contatosSalvarENotificar();
  contCategoriaAtual = null;
  renderContCats();
  const area = document.getElementById("cont-content");
  if (area) {
    area.innerHTML = contatosAgruparEmCards().length
      ? `<div class="cont-empty">👈 Selecione um setor no menu ao lado</div>`
      : `<div class="cont-empty">📂 Nenhum setor cadastrado ainda</div>`;
  }
}

// -------------------------------------------------------------------------
// Conteúdo do setor selecionado: cabeçalho + um "quadradinho" por função
// -------------------------------------------------------------------------
function renderContContent(cardId) {
  const area = document.getElementById("cont-content");
  if (!area) return;
  const cat = contatosAgruparEmCards().find(c => c.card_id === cardId);
  if (!cat) {
    area.innerHTML = `<div class="cont-empty">📂 Setor não encontrado</div>`;
    return;
  }
  const editBtn = adminMode
    ? `<button class="admin-edit-btn" style="margin-left:8px;" onclick="abrirEdicaoContSetor('${cat.card_id}')">✏️ Editar setor</button>`
    : "";
  let html = `
    <div style="display:flex;align-items:center;">
      <div class="cont-setor-header">
        <div class="cont-setor-emoji">${cat.icone}</div>
        <div>
          <div class="tut-content-title" style="margin-bottom:0;">${escapeHtmlRegra(cat.setor)}</div>
        </div>
      </div>
      ${editBtn}
    </div>`;
  html += `<div class="cont-funcoes-grid">`;
  cat.funcoes.forEach((f, idx) => {
    html += renderContFuncaoCard(cat.card_id, f, idx, cat.funcoes.length > 1);
  });
  if (adminMode) {
    html += `
      <button class="cont-add-funcao-card" onclick="abrirNovaContFuncao('${cat.card_id}')">
        <span class="icon">➕</span>
        Adicionar função
      </button>`;
  }
  html += `</div>`;
  area.innerHTML = html;
}

function renderContFuncaoCard(cardId, f, idx, podeExcluir) {
  const titulo = f.titulo
    ? escapeHtmlRegra(f.titulo)
    : `<span class="cont-placeholder">Sem nome definido</span>`;
  const letraBase = (f.fale_com || f.titulo || "?").trim().charAt(0) || "?";
  const foto = f.imagem
    ? `<img class="cont-funcao-foto" src="${f.imagem}" alt="${escapeHtmlRegra(f.titulo || "")}" onclick="abrirFotoContato('${f.imagem}', '${escapeHtmlRegra(f.titulo || "")}')">`
    : `<div class="cont-funcao-foto cont-funcao-foto-placeholder">${escapeHtmlRegra(letraBase)}</div>`;
  const situacoes = (f.caixa_texto1 || "").split("\n").map(s => s.trim()).filter(Boolean);
  const situacoesHtml = situacoes.length
    ? `<ul class="cont-funcao-situacoes">${situacoes.map(s => `<li>${escapeHtmlRegra(s)}</li>`).join("")}</ul>`
    : `<span class="cont-placeholder">Nenhuma situação cadastrada ainda</span>`;
  const contatoHtml = f.fale_com
    ? `<div class="cont-funcao-contato">${escapeHtmlRegra(f.fale_com)}</div>`
    : `<div class="cont-funcao-contato cont-placeholder">Quem procurar ainda não foi definido</div>`;
  const notaHtml = f.caixa_texto2
    ? `<div class="cont-funcao-nota">${escapeHtmlRegra(f.caixa_texto2)}</div>`
    : "";
  const acoesAdmin = adminMode
    ? `<div class="cont-funcao-card-acoes">
         <button class="cont-funcao-card-editar" onclick="abrirEdicaoContFuncao('${cardId}', ${idx})">✏️ Editar</button>
         ${podeExcluir ? `<button class="cont-funcao-card-excluir" onclick="excluirContFuncao('${cardId}', ${idx})">🗑️ Remover</button>` : ""}
       </div>`
    : "";
  return `
    <div class="cont-funcao-card">
      <div class="cont-funcao-header-box">
        <div class="cont-funcao-foto-wrap">
          ${foto}
        </div>
        <div class="cont-funcao-titulo">${titulo}</div>
      </div>
      <div class="cont-funcao-situacoes-title">Quando te procuram por isso</div>
      ${situacoesHtml}
      ${contatoHtml}
      ${notaHtml}
      ${acoesAdmin}
    </div>
  `;
}

// -------------------------------------------------------------------------
// Persistência (mesmo padrão de tutoriais/regras)
// -------------------------------------------------------------------------
async function contatosSalvarENotificar() {
  const resultado = await resyncDataBlock("contatos", CONTATOS_PESSOAS);
  avisarFalhaSalvarNuvem(resultado);
}

// -------------------------------------------------------------------------
// Admin: editar setor (emoji, nome, posição)
// -------------------------------------------------------------------------
function abrirEdicaoContSetor(cardId) {
  const linhas = contatosLinhasDoCard(cardId);
  if (!linhas.length) return;
  const base = linhas[0];
  const area = document.getElementById("cont-content");
  area.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">✏️</div>
            <div><h2>Editando setor</h2></div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Emoji</label>
              <input type="text" id="admin-contsetor-emoji" maxlength="4" style="max-width:80px;" value="${escapeHtmlRegra(base.emoji || "")}">
              <label>Posição no menu (1 = primeiro)</label>
              <input type="number" id="admin-contsetor-ordem" min="1" step="1" style="max-width:100px;" value="${base.ordem_card || 1}">
              <label>Nome do setor</label>
              <input type="text" id="admin-contsetor-nome" value="${escapeHtmlRegra(base.setor || "")}">
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarEdicaoContSetor('${cardId}')">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="document.querySelector('.tut-cat-btn.active').click()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
}

function salvarEdicaoContSetor(cardId) {
  const linhas = contatosLinhasDoCard(cardId);
  if (!linhas.length) return;
  const emoji = document.getElementById("admin-contsetor-emoji").value.trim() || "❓";
  const novaOrdem = parseInt(document.getElementById("admin-contsetor-ordem").value, 10) || 1;
  const nome = document.getElementById("admin-contsetor-nome").value.trim() || linhas[0].setor;
  linhas.forEach(l => {
    l.emoji = emoji;
    l.setor = nome;
  });
  contatosReordenarSetor(cardId, novaOrdem);
  renderContCats();
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
  setContCat(btnAtivo, cardId);
  mostrarFlashSalvo(document.querySelector("#cont-content"));
  contatosSalvarENotificar();
}

// Reordena os setores: move o setor `cardId` para a posição `novaOrdem`
// (1-based) e renumera os demais em sequência, mantendo a ordem relativa.
function contatosReordenarSetor(cardId, novaOrdem) {
  const cards = contatosAgruparEmCards();
  const semAtual = cards.filter(c => c.card_id !== cardId);
  const posicao = Math.max(1, Math.min(novaOrdem, semAtual.length + 1)) - 1;
  semAtual.splice(posicao, 0, { card_id: cardId });
  semAtual.forEach((c, idx) => {
    contatosLinhasDoCard(c.card_id).forEach(l => { l.ordem_card = idx + 1; });
  });
}

// -------------------------------------------------------------------------
// Admin: novo setor (cria já com uma função em branco pronta pra editar)
// -------------------------------------------------------------------------
function abrirNovoContSetor() {
  const area = document.getElementById("cont-content");
  area.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">➕</div>
            <div><h2>Novo setor</h2></div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Emoji do setor</label>
              <input type="text" id="admin-newcontsetor-emoji" placeholder="Ex.: 🎓" maxlength="4" style="max-width:80px;">
              <label>Nome do setor</label>
              <input type="text" id="admin-newcontsetor-nome" placeholder="Ex.: Pedagógico">
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarNovoContSetor()">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="initContatosScreen()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
  setTimeout(() => document.getElementById("admin-newcontsetor-emoji")?.focus(), 50);
}

function salvarNovoContSetor() {
  const emoji = document.getElementById("admin-newcontsetor-emoji").value.trim() || "❓";
  const nome = document.getElementById("admin-newcontsetor-nome").value.trim();
  if (!nome) {
    alert("Digite um nome para o setor.");
    return;
  }
  let base = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "setor";
  let cardId = base, n = 2;
  while (CONTATOS_PESSOAS.some(p => p.card_id === cardId)) {
    cardId = `${base}_${n++}`;
  }
  const maiorOrdem = CONTATOS_PESSOAS.reduce((max, p) => Math.max(max, p.ordem_card || 0), 0);
  CONTATOS_PESSOAS.push({
    card_id: cardId,
    ordem_card: maiorOrdem + 1,
    ordem_pessoa: 1,
    emoji: emoji,
    setor: nome,
    titulo: "",
    fale_com: "",
    imagem: null,
    caixa_texto1: "",
    caixa_texto2: ""
  });
  renderContCats();
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
  setContCat(btnAtivo, cardId);
  contatosSalvarENotificar();
  // Já abre a primeira função pra edição, já que ela nasceu em branco.
  abrirEdicaoContFuncao(cardId, 0);
}

// -------------------------------------------------------------------------
// Admin: editar função (título, situações, quem procurar, aviso)
// -------------------------------------------------------------------------
function abrirEdicaoContFuncao(cardId, idx) {
  const linha = contatosLinhasDoCard(cardId)[idx];
  if (!linha) return;
  const area = document.getElementById("cont-content");
  area.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">✏️</div>
            <div><h2>Editando função</h2></div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Nome da função (ex.: Cancelamento, Matricular pessoas)</label>
              <input type="text" id="admin-contfuncao-titulo" value="${escapeHtmlRegra(linha.titulo || "")}">
              <label>Quando te procuram por isso (uma situação por linha)</label>
              <textarea id="admin-contfuncao-caixa1">${escapeHtmlRegra(linha.caixa_texto1 || "")}</textarea>
              <label>Quem procurar (ex.: Procure a Camila)</label>
              <input type="text" id="admin-contfuncao-falecom" value="${escapeHtmlRegra(linha.fale_com || "")}">
              <label>Aviso/observação (opcional)</label>
              <textarea id="admin-contfuncao-caixa2">${escapeHtmlRegra(linha.caixa_texto2 || "")}</textarea>
              <label>Foto (opcional — deixe em branco para manter a atual)</label>
              <input type="file" id="admin-contfuncao-foto" accept="image/*">
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarEdicaoContFuncao('${cardId}', ${idx})">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="document.querySelector('.tut-cat-btn.active').click()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
  setTimeout(() => document.getElementById("admin-contfuncao-titulo")?.focus(), 50);
}

function salvarEdicaoContFuncao(cardId, idx) {
  const linha = contatosLinhasDoCard(cardId)[idx];
  if (!linha) return;
  linha.titulo = document.getElementById("admin-contfuncao-titulo").value.trim();
  linha.caixa_texto1 = document.getElementById("admin-contfuncao-caixa1").value.trim();
  linha.fale_com = document.getElementById("admin-contfuncao-falecom").value.trim();
  linha.caixa_texto2 = document.getElementById("admin-contfuncao-caixa2").value.trim();
  const fotoInput = document.getElementById("admin-contfuncao-foto");
  const arquivo = fotoInput && fotoInput.files && fotoInput.files[0];
  const finalizar = () => {
    const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
    setContCat(btnAtivo, cardId);
    mostrarFlashSalvo(document.querySelector("#cont-content"));
    contatosSalvarENotificar();
  };
  if (arquivo) {
    if (arquivo.size > 1.5 * 1024 * 1024) {
      alert("Escolha uma imagem menor que 1,5 MB.");
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      linha.imagem = leitor.result;
      finalizar();
    };
    leitor.readAsDataURL(arquivo);
  } else {
    finalizar();
  }
}

function excluirContFuncao(cardId, idx) {
  const linhas = contatosLinhasDoCard(cardId);
  const linha = linhas[idx];
  if (!linha) return;
  if (linhas.length === 1) {
    alert("Esta é a única função do setor. Para removê-la, exclua o setor inteiro.");
    return;
  }
  if (!confirm(`Remover a função "${linha.titulo || "sem nome"}" deste setor?`)) return;
  const posGlobal = CONTATOS_PESSOAS.indexOf(linha);
  if (posGlobal >= 0) CONTATOS_PESSOAS.splice(posGlobal, 1);
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
  setContCat(btnAtivo, cardId);
  contatosSalvarENotificar();
}

// -------------------------------------------------------------------------
// Admin: nova função
// -------------------------------------------------------------------------
function abrirNovaContFuncao(cardId) {
  const area = document.getElementById("cont-content");
  area.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">➕</div>
            <div><h2>Nova função</h2></div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Nome da função (ex.: Cancelamento, Matricular pessoas)</label>
              <input type="text" id="admin-newcontfuncao-titulo" placeholder="Ex.: Cancelamento">
              <label>Quando te procuram por isso (uma situação por linha)</label>
              <textarea id="admin-newcontfuncao-caixa1" placeholder="Uma situação por linha…"></textarea>
              <label>Quem procurar (ex.: Procure a Camila)</label>
              <input type="text" id="admin-newcontfuncao-falecom" placeholder="Ex.: Procure a Camila">
              <label>Aviso/observação (opcional)</label>
              <textarea id="admin-newcontfuncao-caixa2" placeholder="Ex.: 💡 Confirme antes de escalar…"></textarea>
              <label>Foto (opcional)</label>
              <input type="file" id="admin-newcontfuncao-foto" accept="image/*">
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarNovaContFuncao('${cardId}')">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="document.querySelector('.tut-cat-btn[data-cat=\\'${cardId}\\']').click()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
  setTimeout(() => document.getElementById("admin-newcontfuncao-titulo")?.focus(), 50);
}

function salvarNovaContFuncao(cardId) {
  const linhas = contatosLinhasDoCard(cardId);
  if (!linhas.length) return;
  const titulo = document.getElementById("admin-newcontfuncao-titulo").value.trim();
  if (!titulo) {
    alert("Digite o nome da função.");
    return;
  }
  const caixa1 = document.getElementById("admin-newcontfuncao-caixa1").value.trim();
  const falecom = document.getElementById("admin-newcontfuncao-falecom").value.trim();
  const caixa2 = document.getElementById("admin-newcontfuncao-caixa2").value.trim();
  const base = linhas[0];
  const novaLinha = {
    card_id: cardId,
    ordem_card: base.ordem_card,
    ordem_pessoa: linhas.length + 1,
    emoji: base.emoji,
    setor: base.setor,
    titulo: titulo,
    fale_com: falecom,
    imagem: null,
    caixa_texto1: caixa1,
    caixa_texto2: caixa2
  };
  const fotoInput = document.getElementById("admin-newcontfuncao-foto");
  const arquivo = fotoInput && fotoInput.files && fotoInput.files[0];
  const finalizar = () => {
    CONTATOS_PESSOAS.push(novaLinha);
    const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
    setContCat(btnAtivo, cardId);
    mostrarFlashSalvo(document.querySelector("#cont-content"));
    contatosSalvarENotificar();
  };
  if (arquivo) {
    if (arquivo.size > 1.5 * 1024 * 1024) {
      alert("Escolha uma imagem menor que 1,5 MB.");
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      novaLinha.imagem = leitor.result;
      finalizar();
    };
    leitor.readAsDataURL(arquivo);
  } else {
    finalizar();
  }
}

// -------------------------------------------------------------------------
// Lightbox de foto
// -------------------------------------------------------------------------
function abrirFotoContato(src, nome) {
  const lightbox = document.getElementById("cont-lightbox");
  if (!lightbox) return;
  document.getElementById("cont-lightbox-img").src = src;
  document.getElementById("cont-lightbox-img").alt = nome;
  document.getElementById("cont-lightbox-nome").textContent = nome;
  lightbox.classList.add("open");
}

function fecharFotoContato() {
  document.getElementById("cont-lightbox")?.classList.remove("open");
}
 quem procurar.
 *
 * Fonte dos dados: tabela contatos_pessoas no Supabase — uma linha por
 * função. Linhas com o mesmo card_id formam um setor só. CONTATOS_PESSOAS
 * (array "achatado") é preenchido por aplicarDadosSalvos()/Realtime, no
 * index.html; aqui a gente só agrupa por card_id para desenhar a tela.
 *
 * Reaproveitamento de colunas existentes da tabela (sem alterar o
 * schema no Supabase):
 *   - emoji / setor / ordem_card → dados do SETOR (compartilhados por
 *     todas as linhas do mesmo card_id).
 *   - titulo        → título da FUNÇÃO (ex.: "Cancelamento").
 *   - caixa_texto1  → "Quando te procuram por isso" DA FUNÇÃO (uma
 *     situação por linha).
 *   - fale_com      → quem procurar / instrução de contato DA FUNÇÃO
 *     (texto livre, ex.: "Procure a Camila").
 *   - caixa_texto2  → aviso/observação opcional DA FUNÇÃO.
 *   - ordem_pessoa  → ordem da função dentro do setor.
 *   - imagem        → foto/ícone opcional da FUNÇÃO (ex.: foto do
 *     responsável). Se não houver foto, mostra um círculo com a
 *     inicial de quem procurar (ou do nome da função).
 */

// Lista "achatada" — uma entrada por função. Fica vazia até o Supabase
// responder (aplicarDadosSalvos()/Realtime, no index.html, populam este
// array) — os dados moram só na tabela contatos_pessoas, não aqui.
let CONTATOS_PESSOAS = [];

let contCategoriaAtual = null;

function openContatos() {
  if (!exigirPermissao("contatos")) return;
  irParaTela("contatos");
}

// Ao entrar na tela, NÃO seleciona nenhum setor automaticamente — fica
// em branco até a pessoa clicar em algum botão do menu. Isso vale tanto
// na primeira entrada quanto depois de sair e voltar (contCategoriaAtual
// é zerado em resetSelecoesTelas() sempre que se volta pro Início).
function initContatosScreen() {
  renderContCats();
  const cards = contatosAgruparEmCards();
  if (contCategoriaAtual && cards.some(c => c.card_id === contCategoriaAtual)) {
    const btn = document.querySelector(`.tut-cat-btn[data-cat="${contCategoriaAtual}"]`);
    setContCat(btn, contCategoriaAtual);
    return;
  }
  const area = document.getElementById("cont-content");
  if (area) {
    area.innerHTML = cards.length
      ? `<div class="cont-empty">👈 Selecione um setor no menu ao lado</div>`
      : `<div class="cont-empty">📂 Nenhum setor cadastrado ainda</div>`;
  }
}

// -------------------------------------------------------------------------
// Agrupamento: transforma a lista achatada de funções em cards por setor
// -------------------------------------------------------------------------
function contatosAgruparEmCards() {
  const porCard = new Map();
  CONTATOS_PESSOAS.forEach(p => {
    if (!porCard.has(p.card_id)) {
      porCard.set(p.card_id, {
        card_id: p.card_id,
        ordem: p.ordem_card || 0,
        icone: p.emoji || "❓",
        setor: p.setor || "",
        funcoes: []
      });
    }
    porCard.get(p.card_id).funcoes.push(p);
  });
  return Array.from(porCard.values()).sort((a, b) => a.ordem - b.ordem);
}

function contatosLinhasDoCard(cardId) {
  return CONTATOS_PESSOAS.filter(p => p.card_id === cardId);
}

// -------------------------------------------------------------------------
// Menu lateral de setores (mesmas classes/CSS de .tut-cats/.tut-cat-btn)
// -------------------------------------------------------------------------
function renderContCats() {
  const cont = document.getElementById("cont-cats-list");
  if (!cont) return;
  const cards = contatosAgruparEmCards();
  let html = "";
  cards.forEach((cat, idx) => {
    const ativo = cat.card_id === contCategoriaAtual ? "active" : "";
    const delBtn = adminMode ? `<span class="tut-cat-del" data-del-cat="${cat.card_id}" title="Excluir setor">🗑️</span>` : "";
    html += `
          <button class="tut-cat-btn ${ativo}" data-cat="${cat.card_id}">
            <span class="tut-cat-icon" data-num="${idx + 1}"></span> ${escapeHtmlRegra(cat.setor)}${delBtn}
          </button>`;
  });
  cont.innerHTML = html;
  cont.querySelectorAll(".tut-cat-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      if (e.target.closest("[data-del-cat]")) return;
      setContCat(btn, btn.getAttribute("data-cat"));
    });
  });
  cont.querySelectorAll("[data-del-cat]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      excluirContCategoria(el.getAttribute("data-del-cat"));
    });
  });
}

function setContCat(btn, cardId) {
  document.querySelectorAll(".tut-cat-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  contCategoriaAtual = cardId;
  renderContContent(cardId);
}

function excluirContCategoria(cardId) {
  const linhas = contatosLinhasDoCard(cardId);
  if (!linhas.length) return;
  if (!confirm(`Excluir o setor "${linhas[0].setor || cardId}" e todas as suas funções? Essa ação não pode ser desfeita.`)) return;
  CONTATOS_PESSOAS = CONTATOS_PESSOAS.filter(p => p.card_id !== cardId);
  contatosSalvarENotificar();
  contCategoriaAtual = null;
  renderContCats();
  const area = document.getElementById("cont-content");
  if (area) {
    area.innerHTML = contatosAgruparEmCards().length
      ? `<div class="cont-empty">👈 Selecione um setor no menu ao lado</div>`
      : `<div class="cont-empty">📂 Nenhum setor cadastrado ainda</div>`;
  }
}

// -------------------------------------------------------------------------
// Conteúdo do setor selecionado: cabeçalho + um "quadradinho" por função
// -------------------------------------------------------------------------
function renderContContent(cardId) {
  const area = document.getElementById("cont-content");
  if (!area) return;
  const cat = contatosAgruparEmCards().find(c => c.card_id === cardId);
  if (!cat) {
    area.innerHTML = `<div class="cont-empty">📂 Setor não encontrado</div>`;
    return;
  }
  const editBtn = adminMode
    ? `<button class="admin-edit-btn" style="margin-left:8px;" onclick="abrirEdicaoContSetor('${cat.card_id}')">✏️ Editar setor</button>`
    : "";
  let html = `
    <div style="display:flex;align-items:center;">
      <div class="cont-setor-header">
        <div class="cont-setor-emoji">${cat.icone}</div>
        <div>
          <div class="tut-content-title" style="margin-bottom:0;">${escapeHtmlRegra(cat.setor)}</div>
        </div>
      </div>
      ${editBtn}
    </div>`;
  html += `<div class="cont-funcoes-grid">`;
  cat.funcoes.forEach((f, idx) => {
    html += renderContFuncaoCard(cat.card_id, f, idx, cat.funcoes.length > 1);
  });
  if (adminMode) {
    html += `
      <button class="cont-add-funcao-card" onclick="abrirNovaContFuncao('${cat.card_id}')">
        <span class="icon">➕</span>
        Adicionar função
      </button>`;
  }
  html += `</div>`;
  area.innerHTML = html;
}

function renderContFuncaoCard(cardId, f, idx, podeExcluir) {
  const titulo = f.titulo
    ? escapeHtmlRegra(f.titulo)
    : `<span class="cont-placeholder">Sem nome definido</span>`;
  const letraBase = (f.fale_com || f.titulo || "?").trim().charAt(0) || "?";
  const foto = f.imagem
    ? `<img class="cont-funcao-foto" src="${f.imagem}" alt="${escapeHtmlRegra(f.titulo || "")}" onclick="abrirFotoContato('${f.imagem}', '${escapeHtmlRegra(f.titulo || "")}')">`
    : `<div class="cont-funcao-foto cont-funcao-foto-placeholder">${escapeHtmlRegra(letraBase)}</div>`;
  const situacoes = (f.caixa_texto1 || "").split("\n").map(s => s.trim()).filter(Boolean);
  const situacoesHtml = situacoes.length
    ? `<ul class="cont-funcao-situacoes">${situacoes.map(s => `<li>${escapeHtmlRegra(s)}</li>`).join("")}</ul>`
    : `<span class="cont-placeholder">Nenhuma situação cadastrada ainda</span>`;
  const contatoHtml = f.fale_com
    ? `<div class="cont-funcao-contato">${escapeHtmlRegra(f.fale_com)}</div>`
    : `<div class="cont-funcao-contato cont-placeholder">Quem procurar ainda não foi definido</div>`;
  const notaHtml = f.caixa_texto2
    ? `<div class="cont-funcao-nota">${escapeHtmlRegra(f.caixa_texto2)}</div>`
    : "";
  const acoesAdmin = adminMode
    ? `<div class="cont-funcao-card-acoes">
         <button class="cont-funcao-card-editar" onclick="abrirEdicaoContFuncao('${cardId}', ${idx})">✏️ Editar</button>
         ${podeExcluir ? `<button class="cont-funcao-card-excluir" onclick="excluirContFuncao('${cardId}', ${idx})">🗑️ Remover</button>` : ""}
       </div>`
    : "";
  return `
    <div class="cont-funcao-card">
      <div class="cont-funcao-header-box">
        <div class="cont-funcao-foto-wrap">
          ${foto}
        </div>
        <div class="cont-funcao-titulo">${titulo}</div>
      </div>
      <div class="cont-funcao-situacoes-title">Quando te procuram por isso</div>
      ${situacoesHtml}
      ${contatoHtml}
      ${notaHtml}
      ${acoesAdmin}
    </div>
  `;
}

// -------------------------------------------------------------------------
// Persistência (mesmo padrão de tutoriais/regras)
// -------------------------------------------------------------------------
async function contatosSalvarENotificar() {
  const resultado = await resyncDataBlock("contatos", CONTATOS_PESSOAS);
  avisarFalhaSalvarNuvem(resultado);
}

// -------------------------------------------------------------------------
// Admin: editar setor (emoji, nome, posição)
// -------------------------------------------------------------------------
function abrirEdicaoContSetor(cardId) {
  const linhas = contatosLinhasDoCard(cardId);
  if (!linhas.length) return;
  const base = linhas[0];
  const area = document.getElementById("cont-content");
  area.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">✏️</div>
            <div><h2>Editando setor</h2></div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Emoji</label>
              <input type="text" id="admin-contsetor-emoji" maxlength="4" style="max-width:80px;" value="${escapeHtmlRegra(base.emoji || "")}">
              <label>Posição no menu (1 = primeiro)</label>
              <input type="number" id="admin-contsetor-ordem" min="1" step="1" style="max-width:100px;" value="${base.ordem_card || 1}">
              <label>Nome do setor</label>
              <input type="text" id="admin-contsetor-nome" value="${escapeHtmlRegra(base.setor || "")}">
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarEdicaoContSetor('${cardId}')">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="document.querySelector('.tut-cat-btn.active').click()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
}

function salvarEdicaoContSetor(cardId) {
  const linhas = contatosLinhasDoCard(cardId);
  if (!linhas.length) return;
  const emoji = document.getElementById("admin-contsetor-emoji").value.trim() || "❓";
  const novaOrdem = parseInt(document.getElementById("admin-contsetor-ordem").value, 10) || 1;
  const nome = document.getElementById("admin-contsetor-nome").value.trim() || linhas[0].setor;
  linhas.forEach(l => {
    l.emoji = emoji;
    l.setor = nome;
  });
  contatosReordenarSetor(cardId, novaOrdem);
  renderContCats();
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
  setContCat(btnAtivo, cardId);
  mostrarFlashSalvo(document.querySelector("#cont-content"));
  contatosSalvarENotificar();
}

// Reordena os setores: move o setor `cardId` para a posição `novaOrdem`
// (1-based) e renumera os demais em sequência, mantendo a ordem relativa.
function contatosReordenarSetor(cardId, novaOrdem) {
  const cards = contatosAgruparEmCards();
  const semAtual = cards.filter(c => c.card_id !== cardId);
  const posicao = Math.max(1, Math.min(novaOrdem, semAtual.length + 1)) - 1;
  semAtual.splice(posicao, 0, { card_id: cardId });
  semAtual.forEach((c, idx) => {
    contatosLinhasDoCard(c.card_id).forEach(l => { l.ordem_card = idx + 1; });
  });
}

// -------------------------------------------------------------------------
// Admin: novo setor (cria já com uma função em branco pronta pra editar)
// -------------------------------------------------------------------------
function abrirNovoContSetor() {
  const area = document.getElementById("cont-content");
  area.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">➕</div>
            <div><h2>Novo setor</h2></div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Emoji do setor</label>
              <input type="text" id="admin-newcontsetor-emoji" placeholder="Ex.: 🎓" maxlength="4" style="max-width:80px;">
              <label>Nome do setor</label>
              <input type="text" id="admin-newcontsetor-nome" placeholder="Ex.: Pedagógico">
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarNovoContSetor()">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="initContatosScreen()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
  setTimeout(() => document.getElementById("admin-newcontsetor-emoji")?.focus(), 50);
}

function salvarNovoContSetor() {
  const emoji = document.getElementById("admin-newcontsetor-emoji").value.trim() || "❓";
  const nome = document.getElementById("admin-newcontsetor-nome").value.trim();
  if (!nome) {
    alert("Digite um nome para o setor.");
    return;
  }
  let base = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "setor";
  let cardId = base, n = 2;
  while (CONTATOS_PESSOAS.some(p => p.card_id === cardId)) {
    cardId = `${base}_${n++}`;
  }
  const maiorOrdem = CONTATOS_PESSOAS.reduce((max, p) => Math.max(max, p.ordem_card || 0), 0);
  CONTATOS_PESSOAS.push({
    card_id: cardId,
    ordem_card: maiorOrdem + 1,
    ordem_pessoa: 1,
    emoji: emoji,
    setor: nome,
    titulo: "",
    fale_com: "",
    imagem: null,
    caixa_texto1: "",
    caixa_texto2: ""
  });
  renderContCats();
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
  setContCat(btnAtivo, cardId);
  contatosSalvarENotificar();
  // Já abre a primeira função pra edição, já que ela nasceu em branco.
  abrirEdicaoContFuncao(cardId, 0);
}

// -------------------------------------------------------------------------
// Admin: editar função (título, situações, quem procurar, aviso)
// -------------------------------------------------------------------------
function abrirEdicaoContFuncao(cardId, idx) {
  const linha = contatosLinhasDoCard(cardId)[idx];
  if (!linha) return;
  const area = document.getElementById("cont-content");
  area.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">✏️</div>
            <div><h2>Editando função</h2></div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Nome da função (ex.: Cancelamento, Matricular pessoas)</label>
              <input type="text" id="admin-contfuncao-titulo" value="${escapeHtmlRegra(linha.titulo || "")}">
              <label>Quando te procuram por isso (uma situação por linha)</label>
              <textarea id="admin-contfuncao-caixa1">${escapeHtmlRegra(linha.caixa_texto1 || "")}</textarea>
              <label>Quem procurar (ex.: Procure a Camila)</label>
              <input type="text" id="admin-contfuncao-falecom" value="${escapeHtmlRegra(linha.fale_com || "")}">
              <label>Aviso/observação (opcional)</label>
              <textarea id="admin-contfuncao-caixa2">${escapeHtmlRegra(linha.caixa_texto2 || "")}</textarea>
              <label>Foto (opcional — deixe em branco para manter a atual)</label>
              <input type="file" id="admin-contfuncao-foto" accept="image/*">
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarEdicaoContFuncao('${cardId}', ${idx})">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="document.querySelector('.tut-cat-btn.active').click()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
  setTimeout(() => document.getElementById("admin-contfuncao-titulo")?.focus(), 50);
}

function salvarEdicaoContFuncao(cardId, idx) {
  const linha = contatosLinhasDoCard(cardId)[idx];
  if (!linha) return;
  linha.titulo = document.getElementById("admin-contfuncao-titulo").value.trim();
  linha.caixa_texto1 = document.getElementById("admin-contfuncao-caixa1").value.trim();
  linha.fale_com = document.getElementById("admin-contfuncao-falecom").value.trim();
  linha.caixa_texto2 = document.getElementById("admin-contfuncao-caixa2").value.trim();
  const fotoInput = document.getElementById("admin-contfuncao-foto");
  const arquivo = fotoInput && fotoInput.files && fotoInput.files[0];
  const finalizar = () => {
    const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
    setContCat(btnAtivo, cardId);
    mostrarFlashSalvo(document.querySelector("#cont-content"));
    contatosSalvarENotificar();
  };
  if (arquivo) {
    if (arquivo.size > 1.5 * 1024 * 1024) {
      alert("Escolha uma imagem menor que 1,5 MB.");
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      linha.imagem = leitor.result;
      finalizar();
    };
    leitor.readAsDataURL(arquivo);
  } else {
    finalizar();
  }
}

function excluirContFuncao(cardId, idx) {
  const linhas = contatosLinhasDoCard(cardId);
  const linha = linhas[idx];
  if (!linha) return;
  if (linhas.length === 1) {
    alert("Esta é a única função do setor. Para removê-la, exclua o setor inteiro.");
    return;
  }
  if (!confirm(`Remover a função "${linha.titulo || "sem nome"}" deste setor?`)) return;
  const posGlobal = CONTATOS_PESSOAS.indexOf(linha);
  if (posGlobal >= 0) CONTATOS_PESSOAS.splice(posGlobal, 1);
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
  setContCat(btnAtivo, cardId);
  contatosSalvarENotificar();
}

// -------------------------------------------------------------------------
// Admin: nova função
// -------------------------------------------------------------------------
function abrirNovaContFuncao(cardId) {
  const area = document.getElementById("cont-content");
  area.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">➕</div>
            <div><h2>Nova função</h2></div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Nome da função (ex.: Cancelamento, Matricular pessoas)</label>
              <input type="text" id="admin-newcontfuncao-titulo" placeholder="Ex.: Cancelamento">
              <label>Quando te procuram por isso (uma situação por linha)</label>
              <textarea id="admin-newcontfuncao-caixa1" placeholder="Uma situação por linha…"></textarea>
              <label>Quem procurar (ex.: Procure a Camila)</label>
              <input type="text" id="admin-newcontfuncao-falecom" placeholder="Ex.: Procure a Camila">
              <label>Aviso/observação (opcional)</label>
              <textarea id="admin-newcontfuncao-caixa2" placeholder="Ex.: 💡 Confirme antes de escalar…"></textarea>
              <label>Foto (opcional)</label>
              <input type="file" id="admin-newcontfuncao-foto" accept="image/*">
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarNovaContFuncao('${cardId}')">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="document.querySelector('.tut-cat-btn[data-cat=\\'${cardId}\\']').click()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
  setTimeout(() => document.getElementById("admin-newcontfuncao-titulo")?.focus(), 50);
}

function salvarNovaContFuncao(cardId) {
  const linhas = contatosLinhasDoCard(cardId);
  if (!linhas.length) return;
  const titulo = document.getElementById("admin-newcontfuncao-titulo").value.trim();
  if (!titulo) {
    alert("Digite o nome da função.");
    return;
  }
  const caixa1 = document.getElementById("admin-newcontfuncao-caixa1").value.trim();
  const falecom = document.getElementById("admin-newcontfuncao-falecom").value.trim();
  const caixa2 = document.getElementById("admin-newcontfuncao-caixa2").value.trim();
  const base = linhas[0];
  const novaLinha = {
    card_id: cardId,
    ordem_card: base.ordem_card,
    ordem_pessoa: linhas.length + 1,
    emoji: base.emoji,
    setor: base.setor,
    titulo: titulo,
    fale_com: falecom,
    imagem: null,
    caixa_texto1: caixa1,
    caixa_texto2: caixa2
  };
  const fotoInput = document.getElementById("admin-newcontfuncao-foto");
  const arquivo = fotoInput && fotoInput.files && fotoInput.files[0];
  const finalizar = () => {
    CONTATOS_PESSOAS.push(novaLinha);
    const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
    setContCat(btnAtivo, cardId);
    mostrarFlashSalvo(document.querySelector("#cont-content"));
    contatosSalvarENotificar();
  };
  if (arquivo) {
    if (arquivo.size > 1.5 * 1024 * 1024) {
      alert("Escolha uma imagem menor que 1,5 MB.");
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      novaLinha.imagem = leitor.result;
      finalizar();
    };
    leitor.readAsDataURL(arquivo);
  } else {
    finalizar();
  }
}

// -------------------------------------------------------------------------
// Lightbox de foto
// -------------------------------------------------------------------------
function abrirFotoContato(src, nome) {
  const lightbox = document.getElementById("cont-lightbox");
  if (!lightbox) return;
  document.getElementById("cont-lightbox-img").src = src;
  document.getElementById("cont-lightbox-img").alt = nome;
  document.getElementById("cont-lightbox-nome").textContent = nome;
  lightbox.classList.add("open");
}

function fecharFotoContato() {
  document.getElementById("cont-lightbox")?.classList.remove("open");
}
