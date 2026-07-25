// ============================================================
// LÓGICA DEL JUEGO
// ============================================================

// --- Credenciales fijas (solo 2 jugadores) ---
const CREDENTIALS = {
  paul: { user: "Paul", pass: "Paul", name: "Paul" },
  claudia: { user: "Claudia", pass: "Claudia", name: "Claudia" }
};

let currentPlayer = null;   // "paul" | "claudia"
let otherPlayer = null;
let selectedOption = null;  // opción elegida (aún no confirmada) en la pregunta actual
let hasAnsweredThisRound = false;

// --- Referencias de Firebase ---
const refPlayers = db.ref("session/players");
const refGame = db.ref("session/game");
const refChat = db.ref("session/chat");

// --- Elementos del DOM ---
const loginScreen = document.getElementById("login-screen");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const mainUI = document.getElementById("main-ui");

const lobbyView = document.getElementById("lobby-view");
const gameView = document.getElementById("game-view");
const endView = document.getElementById("end-view");

const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const continueBtn = document.getElementById("continue-btn");
const waitingText = document.getElementById("waiting-text");
const questionText = document.getElementById("question-text");
const answersGrid = document.getElementById("answers-grid");
const qCount = document.getElementById("q-count");
const endSummary = document.getElementById("end-summary");

const chatFab = document.getElementById("chat-toggle");
const chatOverlay = document.getElementById("chat-overlay");
const chatDim = document.getElementById("chat-dim");
const chatClose = document.getElementById("chat-close");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const chatBadge = document.getElementById("chat-badge");

const orbPaul = document.getElementById("orb-paul");
const orbClaudia = document.getElementById("orb-claudia");

// ============================================================
// LOGIN
// ============================================================
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value;

  const match = Object.entries(CREDENTIALS).find(
    ([, c]) => c.user.toLowerCase() === user.toLowerCase() && c.pass === pass
  );

  if (!match) {
    loginError.textContent = "Usuario o contraseña incorrectos.";
    return;
  }

  login(match[0]);
});

function login(playerKey) {
  currentPlayer = playerKey;
  otherPlayer = playerKey === "paul" ? "claudia" : "paul";
  localStorage.setItem("dp_player", playerKey);

  // Marcar presencia en Firebase
  const myRef = refPlayers.child(playerKey).child("online");
  myRef.set(true);
  myRef.onDisconnect().set(false);

  loginScreen.classList.remove("active");
  mainUI.classList.remove("hidden");
  loginError.textContent = "";
}

// Auto-login si ya había una sesión guardada en este dispositivo
const savedPlayer = localStorage.getItem("dp_player");
if (savedPlayer && CREDENTIALS[savedPlayer]) {
  login(savedPlayer);
}

// ============================================================
// PRESENCIA (riel de jugadores)
// ============================================================
refPlayers.on("value", (snap) => {
  const data = snap.val() || {};
  orbPaul.classList.toggle("online", !!(data.paul && data.paul.online));
  orbClaudia.classList.toggle("online", !!(data.claudia && data.claudia.online));
});

// ============================================================
// VISTAS
// ============================================================
function showView(name) {
  [lobbyView, gameView, endView].forEach((v) => v.classList.remove("active"));
  if (name === "lobby") lobbyView.classList.add("active");
  if (name === "game") gameView.classList.add("active");
  if (name === "end") endView.classList.add("active");
}

// ============================================================
// JUEGO — estado compartido
// ============================================================
startBtn.addEventListener("click", () => {
  refGame.set({
    status: "playing",
    currentIndex: 0,
    answers: {},
    ready: {}
  });
});

restartBtn.addEventListener("click", () => {
  refGame.set({
    status: "lobby",
    currentIndex: 0,
    answers: {},
    ready: {}
  });
});

let lastRenderedIndex = -1;

refGame.on("value", (snap) => {
  const data = snap.val();
  if (!data || data.status === "lobby") {
    showView("lobby");
    lastRenderedIndex = -1;
    return;
  }

  if (data.status === "ended") {
    renderEnd(data);
    showView("end");
    return;
  }

  // status === "playing"
  showView("game");
  const idx = data.currentIndex || 0;

  if (idx >= QUESTIONS.length) {
    // Alguien debe cerrar el juego (idempotente)
    refGame.child("status").set("ended");
    return;
  }

  if (idx !== lastRenderedIndex) {
    lastRenderedIndex = idx;
    renderQuestion(idx);
  }

  // Actualizar texto de espera / botón según ready flags
  const readyForRound = (data.ready && data.ready[idx]) || {};
  const iAmReady = !!readyForRound[currentPlayer];
  const theyAreReady = !!readyForRound[otherPlayer];

  if (iAmReady) {
    continueBtn.disabled = true;
    waitingText.textContent = theyAreReady
      ? "Avanzando..."
      : `Esperando a ${CREDENTIALS[otherPlayer].name}...`;
  } else {
    waitingText.textContent = "";
  }

  // Avance sincronizado: si ambos están listos, intenta avanzar (transacción segura)
  if (iAmReady && theyAreReady) {
    refGame.child("currentIndex").transaction((current) => {
      if (current === idx) return idx + 1;
      return; // ya avanzó, no hacer nada
    });
  }
});

function renderQuestion(idx) {
  const q = QUESTIONS[idx];
  qCount.textContent = `Pregunta ${idx + 1} de ${QUESTIONS.length}`;
  questionText.textContent = q.question;
  answersGrid.innerHTML = "";
  selectedOption = null;
  hasAnsweredThisRound = false;
  continueBtn.disabled = true;
  waitingText.textContent = "";

  q.options.forEach((optText, optIdx) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = optText;
    btn.addEventListener("click", () => selectAnswer(idx, optIdx, btn));
    answersGrid.appendChild(btn);
  });
}

function selectAnswer(idx, optIdx, btnEl) {
  if (hasAnsweredThisRound) return; // ya confirmó (le dio a Continuar)
  selectedOption = optIdx;
  [...answersGrid.children].forEach((b) => b.classList.remove("selected"));
  btnEl.classList.add("selected");
  continueBtn.disabled = false;

  refGame.child("answers").child(idx).child(currentPlayer).set(optIdx);
}

continueBtn.addEventListener("click", () => {
  if (selectedOption === null || hasAnsweredThisRound) return;
  hasAnsweredThisRound = true;
  const idx = lastRenderedIndex;
  [...answersGrid.children].forEach((b) => (b.disabled = true));
  refGame.child("ready").child(idx).child(currentPlayer).set(true);
});

function renderEnd(data) {
  const answers = data.answers || {};
  let myScore = 0;
  let theirScore = 0;
  QUESTIONS.forEach((q, i) => {
    const round = answers[i] || {};
    if (round[currentPlayer] === q.correct) myScore++;
    if (round[otherPlayer] === q.correct) theirScore++;
  });
  endSummary.textContent =
    `${CREDENTIALS[currentPlayer].name}: ${myScore} · ${CREDENTIALS[otherPlayer].name}: ${theirScore} (de ${QUESTIONS.length})`;
}

// ============================================================
// CHAT
// ============================================================
function openChat() {
  chatOverlay.classList.add("open");
  chatBadge.classList.add("hidden");
}
function closeChat() {
  chatOverlay.classList.remove("open");
}

chatFab.addEventListener("click", openChat);
chatClose.addEventListener("click", closeChat);
chatDim.addEventListener("click", closeChat);

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !currentPlayer) return;
  refChat.push({
    sender: currentPlayer,
    text,
    ts: firebase.database.ServerValue.TIMESTAMP
  });
  chatInput.value = "";
});

refChat.on("child_added", (snap) => {
  const msg = snap.val();
  const bubble = document.createElement("div");
  bubble.className = "chat-msg " + (msg.sender === currentPlayer ? "mine" : "theirs");
  const author = document.createElement("span");
  author.className = "chat-msg-author";
  author.textContent = CREDENTIALS[msg.sender] ? CREDENTIALS[msg.sender].name : msg.sender;
  const body = document.createElement("span");
  body.textContent = msg.text;
  bubble.appendChild(author);
  bubble.appendChild(body);
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (!chatOverlay.classList.contains("open") && msg.sender !== currentPlayer) {
    chatBadge.classList.remove("hidden");
  }
});
