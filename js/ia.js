let IA_HISTORICO = [];

function openIA() {
  if (!exigirPermissao("ia")) return;
  irParaTela("ia");
}

function initIAScreen() {
  const box = document.getElementById("ia-mensagens");
  if (box && !box.children.length) {
    iaAddMsg("bot", "Olá! Pergunte o que precisar sobre regras, portarias, contatos, instituições e cursos do IBREP.");
  }
}

function iaAddMsg(tipo, texto) {
  const box = document.getElementById("ia-mensagens");
  const div = document.createElement("div");
  div.className = "ia-msg " + tipo;
  div.textContent = texto;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

function iaFormatar(texto) {
  const esc = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc
    .replace(/^#{1,6}\s*(.+)$/gm, "<strong>$1</strong>") 
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

async function enviarIA() {
  const input = document.getElementById("ia-input");
  const btn = document.getElementById("ia-enviar");
  const pergunta = input.value.trim();
  if (!pergunta) return;

  input.value = "";
  iaAddMsg("user", pergunta);
  IA_HISTORICO.push({ role: "user", content: pergunta });
  const aguarde = iaAddMsg("bot", "Pensando…");
  btn.disabled = true;

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/chat-ia`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ mensagens: IA_HISTORICO, userId: currentUser.id })
    });
    const data = await resp.json();
    const texto = data.resposta || data.erro || "Não consegui responder.";
    aguarde.innerHTML = iaFormatar(texto);
    IA_HISTORICO.push({ role: "assistant", content: texto });
  } catch (e) {
    aguarde.textContent = "Erro de conexão. Tente novamente.";
  } finally {
    btn.disabled = false;
    input.focus();
    const box = document.getElementById("ia-mensagens");
    if (box) box.scrollTop = box.scrollHeight;
  }
}
