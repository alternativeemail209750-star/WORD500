// game.js — runs in the browser (host view / display view)

// ------------------------------------------------------------
// Mobile viewport fix
// ------------------------------------------------------------
function setRealViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
setRealViewportHeight();
window.addEventListener("resize", setRealViewportHeight);
window.addEventListener("orientationchange", setRealViewportHeight);

// ------------------------------------------------------------
// Element references
// ------------------------------------------------------------
const el = {
  homeBtn: document.getElementById("homeBtn"),
  menuBtn: document.getElementById("menuBtn"),
  statusDot: document.getElementById("statusDot"),
  statusLabel: document.getElementById("statusLabel"),
  streakValue: document.getElementById("streakValue"),
  attemptsValue: document.getElementById("attemptsValue"),

  tilesWrap: document.getElementById("tilesWrap"),
  voteBox: document.getElementById("voteBox"),
  voteTimer: document.getElementById("voteTimer"),
  voteList: document.getElementById("voteList"),
  resultBanner: document.getElementById("resultBanner"),
  resultText: document.getElementById("resultText"),
  newGameBtn: document.getElementById("newGameBtn"),
  idleBanner: document.getElementById("idleBanner"),
  keyboard: document.getElementById("keyboard"),

  leaderboard: document.getElementById("leaderboard"),
  ticker: document.getElementById("ticker"),
  diagGrid: document.getElementById("diagGrid"),
  diagToggle: document.getElementById("diagToggle"),

  controlsHandle: document.getElementById("controlsHandle"),
  controlsBody: document.getElementById("controlsBody"),
  tiktokUsername: document.getElementById("tiktokUsername"),
  connectBtn: document.getElementById("connectBtn"),
  testModeToggle: document.getElementById("testModeToggle"),
  wordLengthSelect: document.getElementById("wordLengthSelect"),
  quickStartSelect: document.getElementById("quickStartSelect"),
  startBtn: document.getElementById("startBtn"),
  giveUpBtn: document.getElementById("giveUpBtn"),
  miniStatus: document.getElementById("miniStatus"),

  howToOverlay: document.getElementById("howToOverlay"),
  closeHowTo: document.getElementById("closeHowTo"),
  closeHowTo2: document.getElementById("closeHowTo2")
};

const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"]
];

// Build the keyboard once; we only ever update key CSS classes after this.
for (const row of KEYBOARD_ROWS) {
  const rowEl = document.createElement("div");
  rowEl.className = "keyRow";
  for (const letter of row) {
    const key = document.createElement("div");
    key.className = "key";
    key.dataset.letter = letter;
    key.textContent = letter;
    rowEl.appendChild(key);
  }
  el.keyboard.appendChild(rowEl);
}

// ------------------------------------------------------------
// Collapsible controls + modal
// ------------------------------------------------------------
el.controlsHandle.addEventListener("click", () => {
  const expanded = el.controlsHandle.getAttribute("aria-expanded") === "true";
  el.controlsHandle.setAttribute("aria-expanded", String(!expanded));
  el.controlsBody.classList.toggle("collapsed", expanded);
});

el.diagToggle.addEventListener("click", () => {
  const showing = el.diagToggle.getAttribute("aria-expanded") === "true";
  el.diagToggle.setAttribute("aria-expanded", String(!showing));
  el.diagToggle.textContent = showing ? "show" : "hide";
  el.diagGrid.style.display = showing ? "none" : "grid";
});

function openHowTo() { el.howToOverlay.hidden = false; }
function closeHowTo() { el.howToOverlay.hidden = true; }
el.menuBtn.addEventListener("click", openHowTo);
el.closeHowTo.addEventListener("click", closeHowTo);
el.closeHowTo2.addEventListener("click", closeHowTo);
el.howToOverlay.addEventListener("click", (e) => { if (e.target === el.howToOverlay) closeHowTo(); });

el.homeBtn.addEventListener("click", () => send("end_game", {}));

// ------------------------------------------------------------
// WebSocket connection to our own server
// ------------------------------------------------------------
let socket = null;
let reconnectDelay = 1000;

function connectSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${window.location.host}`);

  socket.addEventListener("open", () => {
    reconnectDelay = 1000;
    setMiniStatus("Connected to game server.");
  });

  socket.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "state") render(msg.payload);
    } catch (err) {
      console.error("Couldn't read a message from the server:", err);
    }
  });

  socket.addEventListener("close", () => {
    setMiniStatus("Reconnecting to game server…");
    setTimeout(connectSocket, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 1.6, 10000);
  });

  socket.addEventListener("error", () => socket.close());
}
connectSocket();

function send(type, payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, payload }));
  } else {
    setMiniStatus("Not connected to the game server yet — try again in a moment.");
  }
}
function setMiniStatus(text) { el.miniStatus.textContent = text; }

// ------------------------------------------------------------
// Control wiring
// ------------------------------------------------------------
el.connectBtn.addEventListener("click", () => {
  const username = el.tiktokUsername.value.trim();
  if (!username) { setMiniStatus("Type a TikTok username first."); return; }
  el.testModeToggle.checked = false;
  send("connect_tiktok", { username });
});

el.testModeToggle.addEventListener("change", () => {
  send("set_test_mode", { enabled: el.testModeToggle.checked });
});

function startGameFromControls() {
  send("start_game", {
    wordLength: Number(el.wordLengthSelect.value),
    quickStartCount: Number(el.quickStartSelect.value)
  });
}
el.startBtn.addEventListener("click", startGameFromControls);
el.newGameBtn.addEventListener("click", startGameFromControls);
el.giveUpBtn.addEventListener("click", () => send("give_up", {}));

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
const STATUS_LABELS = {
  idle: "Idle", connecting: "Connecting…", retrying: "Retrying connection…",
  live: "LIVE", test_mode: "Test Mode", error: "Connection issue", disconnected: "Disconnected"
};

let lastTilesSignature = "";

function render(state) {
  renderStatusStrip(state);
  renderTiles(state.game);
  renderVoteBox(state.game);
  renderBanners(state.game);
  renderKeyboard(state.game);
  renderLeaderboard(state.leaderboard);
  renderTicker(state.recentComments);
  renderDiagnostics(state.diagnostics);
}

function renderStatusStrip(state) {
  const status = state.diagnostics.connectionStatus || "idle";
  el.statusDot.className = `status-dot ${status}`;
  el.statusLabel.textContent = STATUS_LABELS[status] || status;
  el.streakValue.textContent = state.game.streak;
  el.attemptsValue.textContent = state.game.status === "idle" ? "—" : state.game.maxAttempts != null
    ? `${state.game.attemptsLeft} / ${state.game.maxAttempts}`
    : state.game.attemptsLeft;
}

function renderTiles(g) {
  const signature = `${g.status}|${g.wordLength}|${g.maxAttempts}|${g.guesses.length}`;
  if (signature === lastTilesSignature) return; // avoid replaying flip animation every tick
  lastTilesSignature = signature;

  el.tilesWrap.innerHTML = "";
  const rowsToShow = g.status === "idle" ? 0 : g.maxAttempts;

  for (let r = 0; r < rowsToShow; r++) {
    const rowEl = document.createElement("div");
    rowEl.className = "tileRow";
    const guess = g.guesses[r];

    for (let c = 0; c < g.wordLength; c++) {
      const tile = document.createElement("div");
      if (guess) {
        tile.className = `tile ${guess.feedback[c]}`;
        tile.textContent = guess.word[c];
      } else {
        tile.className = "tile";
        if (r === g.guesses.length && g.status === "live") tile.classList.add("current");
      }
      rowEl.appendChild(tile);
    }
    el.tilesWrap.appendChild(rowEl);
  }
}

function renderVoteBox(g) {
  const showVoteBox = g.status === "live";
  el.voteBox.hidden = !showVoteBox;
  if (!showVoteBox) return;

  el.voteTimer.textContent = `${g.secondsLeftInWindow}s`;

  if (!g.topVotes || g.topVotes.length === 0) {
    el.voteList.className = "voteList empty";
    el.voteList.innerHTML = `<li>No valid guesses yet this round — type a ${g.wordLength}-letter word in chat!</li>`;
    return;
  }
  el.voteList.className = "voteList";
  el.voteList.innerHTML = g.topVotes
    .map((v) => `<li><span class="voteWord">${escapeHtml(v.word)}</span><span class="voteCount">${v.count} vote${v.count === 1 ? "" : "s"}</span></li>`)
    .join("");
}

function renderBanners(g) {
  el.idleBanner.hidden = g.status !== "idle";
  el.resultBanner.hidden = g.status !== "won" && g.status !== "lost";

  if (g.status === "won") {
    const lastGuess = g.guesses[g.guesses.length - 1];
    el.resultBanner.className = "resultBanner win";
    el.resultText.textContent = `🎉 Chat got it! The word was "${(lastGuess?.word || "").toUpperCase()}".`;
  } else if (g.status === "lost") {
    el.resultBanner.className = "resultBanner lost";
    el.resultText.textContent = `⏱ Out of attempts. The word was "${(g.secretWord || "").toUpperCase()}".`;
  }
}

function renderKeyboard(g) {
  const showKeyboard = g.status === "live";
  el.keyboard.style.display = showKeyboard ? "flex" : "none";
  if (!showKeyboard) return;
  const keys = el.keyboard.querySelectorAll(".key");
  keys.forEach((key) => {
    const letter = key.dataset.letter;
    const status = g.keyboardState?.[letter];
    key.className = "key" + (status ? ` ${status}` : "");
  });
}

function renderLeaderboard(list) {
  if (!list || list.length === 0) {
    el.leaderboard.innerHTML = `<li class="empty">Scores will show up here once the game starts.</li>`;
    return;
  }
  el.leaderboard.innerHTML = list
    .map((row, i) => `
      <li>
        <span class="rank">#${i + 1}</span>
        <span class="lbName">${escapeHtml(row.username)}</span>
        <span class="lbScore">${row.score}</span>
      </li>`)
    .join("");
}

function renderTicker(comments) {
  if (!comments || comments.length === 0) {
    el.ticker.innerHTML = `<li class="empty">Waiting for chat to arrive…</li>`;
    return;
  }
  el.ticker.innerHTML = comments
    .map((c) => `<li><span class="tkUser">${escapeHtml(c.username)}</span><span class="tkText">${escapeHtml(c.text)}</span></li>`)
    .join("");
}

function renderDiagnostics(diag) {
  const dictLabel = diag.dictionaryLoading
    ? "Loading…"
    : `${diag.dictionaryWordCount.toLocaleString()} words (${diag.dictionarySource === "full" ? "full list" : "fallback list"})`;
  const dictTone = diag.dictionaryLoading ? "warn" : diag.dictionarySource === "full" ? "good" : "bad";

  const rows = [
    ["Raw events received", diag.rawEventCount, "good"],
    ["Last received", diag.lastReceivedUser ? `${diag.lastReceivedUser}: ${diag.lastReceivedText || "(empty)"}` : "—", null],
    ["Connection status", STATUS_LABELS[diag.connectionStatus] || diag.connectionStatus, statusTone(diag.connectionStatus)],
    ["Signing key set up?", diag.signKeyConfigured ? "Yes" : "No — see setup guide", diag.signKeyConfigured ? "good" : "bad"],
    ["Word dictionary", dictLabel, dictTone],
    ["Retry attempts", `${diag.retryAttempt} / ${diag.maxRetries}`, diag.retryAttempt > 0 ? "warn" : null],
    ["Last message", diag.lastErrorMessage || "—", diag.lastErrorMessage ? "bad" : null]
  ];

  el.diagGrid.innerHTML = rows
    .map(([key, val, tone]) => `
      <div class="diagRow">
        <span class="diagKey">${escapeHtml(key)}</span>
        <span class="diagVal ${tone || ""}">${escapeHtml(String(val))}</span>
      </div>`)
    .join("");

  const busy = diag.connectionStatus === "connecting" || diag.connectionStatus === "retrying";
  el.connectBtn.disabled = busy;
  el.connectBtn.textContent = busy ? "Connecting…" : "Connect";
}

function statusTone(status) {
  if (status === "live" || status === "test_mode") return "good";
  if (status === "error" || status === "disconnected") return "bad";
  if (status === "connecting" || status === "retrying") return "warn";
  return null;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
