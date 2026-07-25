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
let lastRenderedIndex = -1;

// --- Referencias de Firebase ---
const refPlayers = db.ref("session/players");
const refGame = db.ref("session/game");
const refStart = db.ref("session/start");
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
const startWaiting = document.getElementById("start-waiting");
const restartBtn = document.getElementById("restart-btn");
const continueBtn = document.getElementById("continue-btn");
const waitingText = document.getElementById("waiting-text");
const questionText = document.getElementById("question-text");
const answersGrid = document.getElementById("answers-grid");
const revealPanel = document.getElementById("reveal-panel");
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

  const myRef = refPlayers.child(playerKey).child("online");
  myRef.set(true);
  myRef.onDisconnect().set(false);

  loginScreen.classList.remove("active");
  mainUI.classList.remove("hidden");
  loginError.textContent = "";
}

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
// LOBBY — ambos deben darle a "Comenzar"
// ============================================================
startBtn.addEventListener("click", () => {
  if (!currentPlayer) return;
  refStart.child(currentPlayer).set(true);
});

restartBtn.addEventListener("click", () => {
  refStart.set(null);
  refGame.set({ status: "lobby", currentIndex: 0, answers: {}, ready: {} });
});

refStart.on("value", (snap) => {
  const data = snap.val() || {};
  const iStarted = !!data[currentPlayer];
  const theyStarted = !!data[otherPlayer];

  startBtn.disabled = iStarted;
  if (!iStarted) {
    startWaiting.textContent = "";
  } else {
    startWaiting.textContent = theyStarted
      ? "Iniciando..."
      : `Esperando a que ${CREDENTIALS[otherPlayer] ? CREDENTIALS[otherPlayer].name : ""} le dé a Comenzar...`;
  }

  if (iStarted && theyStarted) {
    refGame.transaction((current) => {
      if (current && current.status !== "lobby") return; // ya se transicionó, no tocar
      return { status: "playing", currentIndex: 0, answers: {}, ready: {} };
    });
  }
});

// ============================================================
// JUEGO — pregunta, respuestas, revelación y avance sincronizado
// ============================================================
refGame.on("value", (snap) => {
  const data = snap.val();

  if (!data || data.status === "lobby") {
    showView("lobby");
    lastRenderedIndex = -1;
    return;
  }

  if (data.status === "ended") {
    endSummary.textContent = "Respondieron todas las preguntas. ¡Sigan comentándolo en el chat!";
    showView("end");
    return;
  }

  // status === "playing"
  showView("game");
  const idx = data.currentIndex || 0;

  if (idx >= QUESTIONS.length) {
    refGame.child("status").set("ended"); // idempotente
    return;
  }

  if (idx !== lastRenderedIndex) {
    lastRenderedIndex = idx;
    renderQuestionSkeleton(idx);
  }

  applyRoundState(idx, data);
});

function renderQuestionSkeleton(idx) {
  const q = QUESTIONS[idx];
  qCount.textContent = `Pregunta ${idx + 1} de ${QUESTIONS.length}`;
  questionText.textContent = q.question;
  answersGrid.innerHTML = "";
  revealPanel.classList.add("hidden");
  revealPanel.innerHTML = "";
  waitingText.textContent = "";
  continueBtn.disabled = true;

  q.options.forEach((optText, optIdx) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = optText;
    btn.dataset.index = optIdx;
    btn.addEventListener("click", () => {
      submitAnswer(idx, { type: "preset", index: optIdx });
    });
    answersGrid.appendChild(btn);
  });

  // 4ta opción: respuesta personalizada
  const customRow = document.createElement("div");
  customRow.className = "custom-answer-row";
  customRow.id = "custom-answer-row";
  const input = document.createElement("input");
  input.type = "text";
  input.id = "custom-answer-input";
  input.placeholder = "Escribe tu propia respuesta...";
  input.maxLength = 80;
  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "btn btn-primary";
  submitBtn.id = "custom-answer-submit";
  submitBtn.textContent = "OK";
  const submitCustom = () => {
    const text = input.value.trim();
    if (!text) return;
    submitAnswer(idx, { type: "custom", text });
  };
  submitBtn.addEventListener("click", submitCustom);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitCustom();
  });
  customRow.appendChild(input);
  customRow.appendChild(submitBtn);
  answersGrid.appendChild(customRow);
}

function submitAnswer(idx, answerObj) {
  refGame.child("answers").child(idx).child(currentPlayer).set(answerObj);
}

function applyRoundState(idx, data) {
  const round = (data.answers && data.answers[idx]) || {};
  const myAns = round[currentPlayer];
  const theirAns = round[otherPlayer];
  const locked = myAns !== undefined && myAns !== null;
  const bothAnswered = locked && theirAns !== undefined && theirAns !== null;

  const presetBtns = answersGrid.querySelectorAll(".answer-btn");
  const customInput = document.getElementById("custom-answer-input");
  const customSubmit = document.getElementById("custom-answer-submit");
  const customRow = document.getElementById("custom-answer-row");

  presetBtns.forEach((btn) => {
    btn.disabled = locked;
    const isMine = myAns && myAns.type === "preset" && Number(btn.dataset.index) === myAns.index;
    btn.classList.toggle("selected", !!isMine);
  });
  if (customInput) {
    customInput.disabled = locked;
    customSubmit.disabled = locked;
    const isMine = myAns && myAns.type === "custom";
    customRow.classList.toggle("selected", !!isMine);
    if (isMine && document.activeElement !== customInput) customInput.value = myAns.text;
  }

  const readyRound = (data.ready && data.ready[idx]) || {};
  const iReady = !!readyRound[currentPlayer];
  const theyReady = !!readyRound[otherPlayer];

  if (!bothAnswered) {
    revealPanel.classList.add("hidden");
    continueBtn.disabled = true;
    waitingText.textContent = locked
      ? `Esperando la respuesta de ${CREDENTIALS[otherPlayer].name}...`
      : "";
    return;
  }

  // Ambos respondieron: mostrar revelación
  renderReveal(idx, round);
  revealPanel.classList.remove("hidden");

  if (iReady) {
    continueBtn.disabled = true;
    waitingText.textContent = theyReady
      ? "Avanzando..."
      : `Esperando a que ${CREDENTIALS[otherPlayer].name} le dé a Continuar...`;
  } else {
    continueBtn.disabled = false;
    waitingText.textContent = "Coméntenlo en el chat cuando quieran.";
  }

  if (iReady && theyReady) {
    refGame.child("currentIndex").transaction((current) => {
      if (current === idx) return idx + 1;
      return; // ya avanzó
    });
  }
}

function renderReveal(idx, round) {
  revealPanel.innerHTML = "";
  [currentPlayer, otherPlayer].forEach((p) => {
    const ans = round[p];
    if (!ans) return;
    const text = ans.type === "custom" ? ans.text : QUESTIONS[idx].options[ans.index];

    const row = document.createElement("div");
    row.className = `reveal-row reveal-${p}`;

    const name = document.createElement("span");
    name.className = "reveal-name";
    name.textContent = CREDENTIALS[p].name;

    const textEl = document.createElement("span");
    textEl.className = "reveal-text";
    textEl.textContent = text;

    row.appendChild(name);
    row.appendChild(textEl);
    revealPanel.appendChild(row);
  });
}

continueBtn.addEventListener("click", () => {
  if (continueBtn.disabled) return;
  refGame.child("ready").child(lastRenderedIndex).child(currentPlayer).set(true);
});

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
  const senderInfo = CREDENTIALS[msg.sender];
  const isMine = msg.sender === currentPlayer;

  const bubbleWrap = document.createElement("div");
  bubbleWrap.className = `chat-msg ${msg.sender} ${isMine ? "mine" : "theirs"}`;

  const avatar = document.createElement("span");
  avatar.className = "chat-avatar";
  avatar.textContent = senderInfo ? senderInfo.name.charAt(0) : "?";

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";

  const author = document.createElement("span");
  author.className = "chat-msg-author";
  author.textContent = senderInfo ? senderInfo.name : msg.sender;

  const body = document.createElement("span");
  body.textContent = msg.text;

  bubble.appendChild(author);
  bubble.appendChild(body);
  bubbleWrap.appendChild(avatar);
  bubbleWrap.appendChild(bubble);
  chatMessages.appendChild(bubbleWrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (!chatOverlay.classList.contains("open") && !isMine) {
    chatBadge.classList.remove("hidden");
  }
});
