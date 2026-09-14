/**
 * IBREP Prism — Módulo: Quem Procurar (contatos)
 * ---------------------------------------------------
 * Mapa de responsáveis por assunto (Pedagógico, Financeiro, Comercial,
 * Cancelamento, Administrativo…). O layout é o MESMO da tela de
 * Tutoriais: menu de setores à esquerda (.tut-cats/.tut-cat-btn) e o
 * conteúdo do setor selecionado à direita (.tut-content) — reaproveita
 * as classes/CSS de lá de propósito, pra ficar visualmente idêntico.
 *
 * Fonte dos dados: tabela contatos_pessoas no Supabase — uma linha por
 * pessoa. Linhas com o mesmo card_id formam um setor só. CONTATOS_PESSOAS
 * (array "achatado") é preenchido por aplicarDadosSalvos()/Realtime, no
 * index.html; aqui a gente só agrupa por card_id para desenhar a tela e
 * cada pessoa vira um "quadradinho" (cont-pessoa-card) separado dentro
 * do setor — nunca um card só compartilhado entre pessoas.
 */

// Lista "achatada" — uma entrada por pessoa. Fica vazia até o Supabase
// responder (aplicarDadosSalvos()/Realtime, no index.html, populam este
// array) — os dados moram só na tabela contatos_pessoas, não aqui.
let CONTATOS_PESSOAS = [];

let contCategoriaAtual = null;

function openContatos() {
  if (!exigirPermissao("contatos")) return;
  irParaTela("contatos");
}

function initContatosScreen() {
  renderContCats();
  const cards = contatosAgruparEmCards();
  const chave = contCategoriaAtual && cards.some(c => c.card_id === contCategoriaAtual)
    ? contCategoriaAtual
    : (cards[0] && cards[0].card_id);
  const btn = document.querySelector(`.tut-cat-btn[data-cat="${chave}"]`);
  if (btn) setContCat(btn, chave);
  else document.getElementById("cont-content").innerHTML = `<div class="cont-empty">📂 Nenhum setor cadastrado ainda</div>`;
}

// -------------------------------------------------------------------------
// Agrupamento: transforma a lista achatada de pessoas em cards por setor
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
        resumo: p.titulo || "",
        situacoes: (p.caixa_texto1 || "").split("\n").map(s => s.trim()).filter(Boolean),
        nota: p.caixa_texto2 || "",
        pessoas: []
      });
    }
    porCard.get(p.card_id).pessoas.push({
      nome: (p.fale_com || "").split("—")[0].trim(),
      papel: (p.fale_com || "").includes("—") ? p.fale_com.split("—").slice(1).join("—").trim() : "",
      foto: p.imagem || null,
      _linha: p
    });
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
  if (!confirm(`Excluir o setor "${linhas[0].setor || cardId}" e todos os seus contatos? Essa ação não pode ser desfeita.`)) return;
  CONTATOS_PESSOAS = CONTATOS_PESSOAS.filter(p => p.card_id !== cardId);
  contatosSalvarENotificar();
  const cards = contatosAgruparEmCards();
  renderContCats();
  if (cards.length) {
    const proxima = cards[0].card_id;
    const btn = document.querySelector(`.tut-cat-btn[data-cat="${proxima}"]`);
    setContCat(btn, proxima);
  } else {
    contCategoriaAtual = null;
    document.getElementById("cont-content").innerHTML = `<div class="cont-empty">📂 Nenhum setor cadastrado ainda</div>`;
  }
}

// -------------------------------------------------------------------------
// Conteúdo do setor selecionado: cabeçalho + um "quadradinho" por pessoa
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
          <div class="tut-content-title" style="margin-bottom:2px;">${escapeHtmlRegra(cat.setor)}</div>
          <div class="tut-content-desc" style="margin-bottom:0;">${cat.resumo ? escapeHtmlRegra(cat.resumo) : `<span class="cont-placeholder">Sem resumo cadastrado</span>`}</div>
        </div>
      </div>
      ${editBtn}
    </div>
    <div class="cont-situacoes-box">
      <div class="cont-situacoes-title">Quando te procuram por isso</div>
      ${cat.situacoes.length
        ? `<ul class="cont-situacoes">${cat.situacoes.map(s => `<li>${escapeHtmlRegra(s)}</li>`).join("")}</ul>`
        : `<span class="cont-placeholder">Nenhuma situação cadastrada ainda</span>`}
    </div>`;
  if (cat.nota) {
    html += `<div class="cont-nota">${escapeHtmlRegra(cat.nota)}</div>`;
  }
  html += `<div class="cont-pessoas-grid">`;
  cat.pessoas.forEach((p, idx) => {
    html += renderContPessoaCard(cat.card_id, p, idx, cat.pessoas.length > 1);
  });
  if (adminMode) {
    html += `
      <button class="cont-add-pessoa-card" onclick="abrirNovaContPessoa('${cat.card_id}')">
        <span class="icon">➕</span>
        Adicionar pessoa
      </button>`;
  }
  html += `</div>`;
  area.innerHTML = html;
}

function renderContPessoaCard(cardId, p, idx, podeExcluir) {
  const semNome = !p.nome;
  const foto = p.foto
    ? `<img class="cont-foto" src="${p.foto}" alt="${escapeHtmlRegra(p.nome)}" onclick="abrirFotoContato('${p.foto}', '${escapeHtmlRegra(p.nome)}')">`
    : `<div class="cont-foto cont-foto-placeholder">${escapeHtmlRegra((p.nome || "?").charAt(0) || "?")}</div>`;
  const acoesAdmin = adminMode
    ? `<div class="cont-pessoa-card-acoes">
         <button class="cont-pessoa-card-editar" onclick="abrirEdicaoContPessoa('${cardId}', ${idx})">✏️ Editar</button>
         ${podeExcluir ? `<button class="cont-pessoa-card-excluir" onclick="excluirContPessoa('${cardId}', ${idx})">🗑️ Remover</button>` : ""}
       </div>`
    : "";
  return `
    <div class="cont-pessoa-card">
      <div class="cont-foto-wrap">
        ${foto}
      </div>
      <div class="cont-pessoa-nome">${semNome ? `<span class="cont-placeholder">Sem responsável</span>` : escapeHtmlRegra(p.nome)}</div>
      <div class="cont-pessoa-papel">${escapeHtmlRegra(p.papel) || "&nbsp;"}</div>
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
// Admin: editar setor (emoji, nome, resumo, situações, aviso)
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
              <label>Resumo (aparece embaixo do título)</label>
              <input type="text" id="admin-contsetor-resumo" value="${escapeHtmlRegra(base.titulo || "")}">
              <label>Quando te procuram por isso (uma situação por linha)</label>
              <textarea id="admin-contsetor-caixa1">${escapeHtmlRegra(base.caixa_texto1 || "")}</textarea>
              <label>Aviso/observação (opcional)</label>
              <textarea id="admin-contsetor-caixa2">${escapeHtmlRegra(base.caixa_texto2 || "")}</textarea>
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
  const resumo = document.getElementById("admin-contsetor-resumo").value.trim();
  const caixa1 = document.getElementById("admin-contsetor-caixa1").value.trim();
  const caixa2 = document.getElementById("admin-contsetor-caixa2").value.trim();
  linhas.forEach(l => {
    l.emoji = emoji;
    l.setor = nome;
    l.titulo = resumo;
    l.caixa_texto1 = caixa1;
    l.caixa_texto2 = caixa2;
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
// Admin: novo setor
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
              <label>Resumo (aparece embaixo do título)</label>
              <input type="text" id="admin-newcontsetor-resumo" placeholder="Ex.: Dúvidas sobre disciplinas, notas e currículo">
              <label>Quando te procuram por isso (uma situação por linha, opcional)</label>
              <textarea id="admin-newcontsetor-caixa1" placeholder="Uma situação por linha…"></textarea>
              <label>Aviso/observação (opcional)</label>
              <textarea id="admin-newcontsetor-caixa2" placeholder="Ex.: 💡 Confirme antes de escalar…"></textarea>
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
  const resumo = document.getElementById("admin-newcontsetor-resumo").value.trim();
  const caixa1 = document.getElementById("admin-newcontsetor-caixa1").value.trim();
  const caixa2 = document.getElementById("admin-newcontsetor-caixa2").value.trim();
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
    titulo: resumo,
    fale_com: "",
    imagem: null,
    caixa_texto1: caixa1,
    caixa_texto2: caixa2
  });
  renderContCats();
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
  setContCat(btnAtivo, cardId);
  mostrarFlashSalvo(document.querySelector("#cont-content"));
  contatosSalvarENotificar();
}

// -------------------------------------------------------------------------
// Admin: editar pessoa (nome, papel, foto)
// -------------------------------------------------------------------------
function abrirEdicaoContPessoa(cardId, idx) {
  const linha = contatosLinhasDoCard(cardId)[idx];
  if (!linha) return;
  const nomeAtual = (linha.fale_com || "").split("—")[0].trim();
  const papelAtual = (linha.fale_com || "").includes("—") ? linha.fale_com.split("—").slice(1).join("—").trim() : "";
  const area = document.getElementById("cont-content");
  area.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">✏️</div>
            <div><h2>Editando pessoa</h2></div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Nome</label>
              <input type="text" id="admin-contpessoa-nome" value="${escapeHtmlRegra(nomeAtual)}">
              <label>Papel/condição (ex.: Responsável, ou "Se a Camila avisar que está fora")</label>
              <input type="text" id="admin-contpessoa-papel" value="${escapeHtmlRegra(papelAtual)}">
              <label>Foto (opcional — deixe em branco para manter a atual)</label>
              <input type="file" id="admin-contpessoa-foto" accept="image/*">
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarEdicaoContPessoa('${cardId}', ${idx})">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="document.querySelector('.tut-cat-btn.active').click()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
}

function salvarEdicaoContPessoa(cardId, idx) {
  const linha = contatosLinhasDoCard(cardId)[idx];
  if (!linha) return;
  const nome = document.getElementById("admin-contpessoa-nome").value.trim();
  const papel = document.getElementById("admin-contpessoa-papel").value.trim();
  linha.fale_com = nome ? (papel ? `${nome} — ${papel}` : nome) : "";
  const fotoInput = document.getElementById("admin-contpessoa-foto");
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

function excluirContPessoa(cardId, idx) {
  const linhas = contatosLinhasDoCard(cardId);
  const linha = linhas[idx];
  if (!linha) return;
  if (linhas.length === 1) {
    alert("Este é o único contato do setor. Para removê-lo, exclua o setor inteiro.");
    return;
  }
  if (!confirm(`Remover "${(linha.fale_com || "").split("—")[0].trim() || "esta pessoa"}" deste setor?`)) return;
  const posGlobal = CONTATOS_PESSOAS.indexOf(linha);
  if (posGlobal >= 0) CONTATOS_PESSOAS.splice(posGlobal, 1);
  const btnAtivo = document.querySelector(`.tut-cat-btn[data-cat="${cardId}"]`);
  setContCat(btnAtivo, cardId);
  contatosSalvarENotificar();
}

// -------------------------------------------------------------------------
// Admin: nova pessoa
// -------------------------------------------------------------------------
function abrirNovaContPessoa(cardId) {
  const area = document.getElementById("cont-content");
  area.innerHTML = `
        <div class="regras-detail-card">
          <div class="regras-detail-header">
            <div class="regras-detail-icon">➕</div>
            <div><h2>Nova pessoa</h2></div>
          </div>
          <div class="regras-detail-content">
            <div class="admin-inline-form">
              <label>Nome</label>
              <input type="text" id="admin-newcontpessoa-nome" placeholder="Ex.: Mariana">
              <label>Papel/condição (opcional)</label>
              <input type="text" id="admin-newcontpessoa-papel" placeholder="Ex.: Responsável" value="Responsável">
              <label>Foto (opcional)</label>
              <input type="file" id="admin-newcontpessoa-foto" accept="image/*">
              <div style="display:flex;gap:8px;">
                <button class="admin-edit-btn save" onclick="salvarNovaContPessoa('${cardId}')">💾 Salvar</button>
                <button class="admin-edit-btn" style="background:var(--cinza-borda);color:var(--texto-sec);" onclick="document.querySelector('.tut-cat-btn[data-cat=\\'${cardId}\\']').click()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>`;
  setTimeout(() => document.getElementById("admin-newcontpessoa-nome")?.focus(), 50);
}

function salvarNovaContPessoa(cardId) {
  const linhas = contatosLinhasDoCard(cardId);
  if (!linhas.length) return;
  const nome = document.getElementById("admin-newcontpessoa-nome").value.trim();
  if (!nome) {
    alert("Digite o nome da pessoa.");
    return;
  }
  const papel = document.getElementById("admin-newcontpessoa-papel").value.trim();
  const base = linhas[0];
  const novaLinha = {
    card_id: cardId,
    ordem_card: base.ordem_card,
    ordem_pessoa: linhas.length + 1,
    emoji: base.emoji,
    setor: base.setor,
    titulo: base.titulo,
    fale_com: papel ? `${nome} — ${papel}` : nome,
    imagem: null,
    caixa_texto1: base.caixa_texto1,
    caixa_texto2: base.caixa_texto2
  };
  const fotoInput = document.getElementById("admin-newcontpessoa-foto");
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
