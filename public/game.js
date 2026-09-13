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
  brandDot: document.getElementById("brandDot"),
  modeBadge: document.getElementById("modeBadge"),
  hintBtn: document.getElementById("hintBtn"),
  hintBadge: document.getElementById("hintBadge"),
  helpBtn: document.getElementById("helpBtn"),
  leaderboardBtn: document.getElementById("leaderboardBtn"),
  settingsBtn: document.getElementById("settingsBtn"),

  attemptsStat: document.getElementById("attemptsStat"),
  lengthStat: document.getElementById("lengthStat"),
  tilesWrap: document.getElementById("tilesWrap"),
  hintChips: document.getElementById("hintChips"),
  voteBox: document.getElementById("voteBox"),
  voteTimer: document.getElementById("voteTimer"),
  voteList: document.getElementById("voteList"),
  offlineNote: document.getElementById("offlineNote"),
  resultBanner: document.getElementById("resultBanner"),
  resultText: document.getElementById("resultText"),
  playAgainBtn: document.getElementById("playAgainBtn"),
  autoContinueNote: document.getElementById("autoContinueNote"),
  idleBanner: document.getElementById("idleBanner"),
  keyboard: document.getElementById("keyboard"),
  activityToggle: document.getElementById("activityToggle"),
  activityChev: document.getElementById("activityChev"),
  ticker: document.getElementById("ticker"),

  controlsHandle: document.getElementById("controlsHandle"),
  controlsBody: document.getElementById("controlsBody"),
  liveControls: document.getElementById("liveControls"),
  testControls: document.getElementById("testControls"),
  offlineControls: document.getElementById("offlineControls"),
  tiktokUsernameBottom: document.getElementById("tiktokUsernameBottom"),
  connectBtnBottom: document.getElementById("connectBtnBottom"),
  offlineGuessInput: document.getElementById("offlineGuessInput"),
  offlineGuessBtn: document.getElementById("offlineGuessBtn"),
  offlineError: document.getElementById("offlineError"),
  giveUpBtn: document.getElementById("giveUpBtn"),
  miniStatus: document.getElementById("miniStatus"),

  settingsOverlay: document.getElementById("settingsOverlay"),
  closeSettings: document.getElementById("closeSettings"),
  modeChip: document.getElementById("modeChip"),
  connChip: document.getElementById("connChip"),
  modePickerBtn: document.getElementById("modePickerBtn"),
  modePickerLabel: document.getElementById("modePickerLabel"),
  tiktokUsername: document.getElementById("tiktokUsername"),
  connectBtn: document.getElementById("connectBtn"),
  disconnectBtn: document.getElementById("disconnectBtn"),
  wordLengthSelect: document.getElementById("wordLengthSelect"),
  autoContinueToggle: document.getElementById("autoContinueToggle"),
  delayInput: document.getElementById("delayInput"),
  applyBtn: document.getElementById("applyBtn"),
  diagToggle: document.getElementById("diagToggle"),
  diagGrid: document.getElementById("diagGrid"),
  resetRoundBtn: document.getElementById("resetRoundBtn"),
  resetTotalBtn: document.getElementById("resetTotalBtn"),

  modePickerOverlay: document.getElementById("modePickerOverlay"),

  leaderboardOverlay: document.getElementById("leaderboardOverlay"),
  closeLeaderboard: document.getElementById("closeLeaderboard"),
  tabThisRound: document.getElementById("tabThisRound"),
  tabAllTime: document.getElementById("tabAllTime"),
  leaderboardList: document.getElementById("leaderboardList"),
  leaderboardNote: document.getElementById("leaderboardNote"),

  howToOverlay: document.getElementById("howToOverlay"),
  closeHowTo: document.getElementById("closeHowTo"),
  closeHowTo2: document.getElementById("closeHowTo2")
};

const MODE_LABELS = {
  live: { title: "Live", desc: "Counts for the chat leaderboard" },
  test: { title: "Test", desc: "Practice — scores not saved" },
  offline: { title: "Offline", desc: "Host plays solo" }
};

// ------------------------------------------------------------
// Build the keyboard once
// ------------------------------------------------------------
const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"]
];
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
// Populate the word-length dropdown (4 through 20 letters)
// ------------------------------------------------------------
for (let n = 4; n <= 20; n++) {
  const opt = document.createElement("option");
  opt.value = String(n);
  opt.textContent = `${n} letters`;
  if (n === 5) opt.selected = true;
  el.wordLengthSelect.appendChild(opt);
}

// ------------------------------------------------------------
// Staged settings (only take effect when "Apply" is tapped)
// ------------------------------------------------------------
let stagedMode = "test";

function syncStagedSettingsFromState(g) {
  stagedMode = g.mode;
  el.wordLengthSelect.value = String(g.wordLength);
  el.autoContinueToggle.checked = g.autoContinue;
  el.delayInput.value = g.autoContinueDelaySeconds;
  updateModePickerLabel();
}

function updateModePickerLabel() {
  const info = MODE_LABELS[stagedMode];
  el.modePickerLabel.textContent = `${info.title} — ${info.desc}`;
  document.querySelectorAll(".pickerOption").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.mode === stagedMode);
  });
}

// ------------------------------------------------------------
// Collapsible bottom controls
// ------------------------------------------------------------
el.controlsHandle.addEventListener("click", () => {
  const expanded = el.controlsHandle.getAttribute("aria-expanded") === "true";
  el.controlsHandle.setAttribute("aria-expanded", String(!expanded));
  el.controlsBody.classList.toggle("collapsed", expanded);
});

el.activityToggle.addEventListener("click", () => {
  const expanded = el.activityToggle.getAttribute("aria-expanded") === "true";
  el.activityToggle.setAttribute("aria-expanded", String(!expanded));
  el.ticker.classList.toggle("collapsed", expanded);
});

el.diagToggle.addEventListener("click", () => {
  const showing = el.diagToggle.getAttribute("aria-expanded") === "true";
  el.diagToggle.setAttribute("aria-expanded", String(!showing));
  el.diagToggle.textContent = showing ? "show" : "hide";
  el.diagGrid.style.display = showing ? "none" : "grid";
});

// ------------------------------------------------------------
// Drawers & modals
// ------------------------------------------------------------
function openDrawer(overlay) { overlay.hidden = false; }
function closeDrawer(overlay) { overlay.hidden = true; }

el.settingsBtn.addEventListener("click", () => {
  if (lastState) syncStagedSettingsFromState(lastState.game);
  openDrawer(el.settingsOverlay);
});
el.closeSettings.addEventListener("click", () => closeDrawer(el.settingsOverlay));
el.settingsOverlay.addEventListener("click", (e) => { if (e.target === el.settingsOverlay) closeDrawer(el.settingsOverlay); });

el.leaderboardBtn.addEventListener("click", () => { openDrawer(el.leaderboardOverlay); renderLeaderboardTab(); });
el.closeLeaderboard.addEventListener("click", () => closeDrawer(el.leaderboardOverlay));
el.leaderboardOverlay.addEventListener("click", (e) => { if (e.target === el.leaderboardOverlay) closeDrawer(el.leaderboardOverlay); });

el.helpBtn.addEventListener("click", () => { el.howToOverlay.hidden = false; });
el.closeHowTo.addEventListener("click", () => { el.howToOverlay.hidden = true; });
el.closeHowTo2.addEventListener("click", () => { el.howToOverlay.hidden = true; });
el.howToOverlay.addEventListener("click", (e) => { if (e.target === el.howToOverlay) el.howToOverlay.hidden = true; });

el.modePickerBtn.addEventListener("click", () => { el.modePickerOverlay.hidden = false; });
el.modePickerOverlay.addEventListener("click", (e) => { if (e.target === el.modePickerOverlay) el.modePickerOverlay.hidden = true; });
document.querySelectorAll(".pickerOption").forEach((btn) => {
  btn.addEventListener("click", () => {
    stagedMode = btn.dataset.mode;
    updateModePickerLabel();
    el.modePickerOverlay.hidden = true;
  });
});

let activeLeaderboardTab = "round";
el.tabThisRound.addEventListener("click", () => { activeLeaderboardTab = "round"; renderLeaderboardTab(); });
el.tabAllTime.addEventListener("click", () => { activeLeaderboardTab = "total"; renderLeaderboardTab(); });

// ------------------------------------------------------------
// WebSocket connection
// ------------------------------------------------------------
let socket = null;
let reconnectDelay = 1000;
let lastState = null;

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
      else if (msg.type === "offline_guess_result") handleOfflineGuessResult(msg.payload);
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
function doConnect(usernameInput) {
  const username = usernameInput.value.trim();
  if (!username) { setMiniStatus("Type a TikTok username first."); return; }
  send("connect_tiktok", { username });
}
el.connectBtn.addEventListener("click", () => doConnect(el.tiktokUsername));
el.connectBtnBottom.addEventListener("click", () => doConnect(el.tiktokUsernameBottom));
el.disconnectBtn.addEventListener("click", () => send("disconnect_tiktok", {}));

el.applyBtn.addEventListener("click", () => {
  send("apply_settings", {
    mode: stagedMode,
    wordLength: Number(el.wordLengthSelect.value),
    autoContinue: el.autoContinueToggle.checked,
    autoContinueDelaySeconds: Number(el.delayInput.value) || 12
  });
  closeDrawer(el.settingsOverlay);
});

el.playAgainBtn.addEventListener("click", () => send("play_again", {}));
el.giveUpBtn.addEventListener("click", () => send("give_up", {}));
el.hintBtn.addEventListener("click", () => send("use_hint", {}));

el.resetRoundBtn.addEventListener("click", () => send("reset_round_leaderboard", {}));
el.resetTotalBtn.addEventListener("click", () => send("reset_total_leaderboard", {}));

function submitOfflineGuess() {
  const word = el.offlineGuessInput.value.trim();
  if (!word) return;
  send("submit_offline_guess", { word });
}
el.offlineGuessBtn.addEventListener("click", submitOfflineGuess);
el.offlineGuessInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitOfflineGuess(); });

function handleOfflineGuessResult(result) {
  if (result.ok) {
    el.offlineError.textContent = "";
    el.offlineGuessInput.value = "";
  } else {
    el.offlineError.textContent = result.error || "That guess didn't work.";
  }
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
const CONNECTION_LABELS = {
  idle: "Idle", connecting: "Connecting…", retrying: "Retrying…",
  live: "LIVE", test_mode: "Simulating (Test Mode)", error: "Connection issue", disconnected: "Disconnected"
};

let lastTilesSignature = "";

function render(state) {
  lastState = state;
  renderHeader(state);
  renderModeUI(state.game);
  renderStats(state.game);
  renderTiles(state.game);
  renderHintChips(state.game);
  renderVoteOrOffline(state.game);
  renderBanners(state.game);
  renderKeyboard(state.game);
  renderTicker(state.recentComments);
  renderSettingsChips(state);
  renderDiagnostics(state.diagnostics);
  if (!el.leaderboardOverlay.hidden) renderLeaderboardTab();
}

function renderHeader(state) {
  const connStatus = state.diagnostics.connectionStatus || "idle";
  el.brandDot.className = `brandDot ${state.game.mode === "test" ? "test_mode" : connStatus}`;
  el.modeBadge.textContent = state.game.mode.toUpperCase();
  el.modeBadge.className = `modeBadge ${state.game.mode}`;

  const hintsLeft = state.game.maxHints - state.game.hintsUsed;
  el.hintBadge.textContent = String(hintsLeft);
  el.hintBtn.disabled = state.game.status !== "live" || hintsLeft <= 0;
}

function renderModeUI(g) {
  el.liveControls.hidden = g.mode !== "live";
  el.testControls.hidden = g.mode !== "test";
  el.offlineControls.hidden = g.mode !== "offline";
}

function renderStats(g) {
  el.attemptsStat.textContent = g.status === "idle" ? "—" : `${g.attemptsLeft} / ${g.maxAttempts}`;
  el.lengthStat.textContent = g.status === "idle" ? "—" : `${g.wordLength} letters`;
}

function renderTiles(g) {
  const signature = `${g.status}|${g.wordLength}|${g.maxAttempts}|${g.guesses.length}`;
  if (signature === lastTilesSignature) return;
  lastTilesSignature = signature;

  el.tilesWrap.innerHTML = "";
  const rowsToShow = g.status === "idle" ? 0 : g.maxAttempts;

  for (let r = 0; r < rowsToShow; r++) {
    const rowEl = document.createElement("div");
    rowEl.className = "tileRow";
    const guess = g.guesses[r];

    for (let c = 0; c < g.wordLength; c++) {
      const tile = document.createElement("div");
      tile.style.setProperty("--i", c);
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

function renderHintChips(g) {
  if (!g.revealedHints || g.revealedHints.length === 0) {
    el.hintChips.innerHTML = "";
    return;
  }
  el.hintChips.innerHTML = g.revealedHints
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((h) => `<span class="hintChip">Letter ${h.position + 1}: ${h.letter.toUpperCase()}</span>`)
    .join("");
}

function renderVoteOrOffline(g) {
  const showVote = g.status === "live" && g.mode !== "offline";
  const showOffline = g.status === "live" && g.mode === "offline";
  el.voteBox.hidden = !showVote;
  el.offlineNote.hidden = !showOffline;
  if (!showVote) return;

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
    el.resultText.textContent = `🎉 Solved it! The word was "${(lastGuess && lastGuess.word ? lastGuess.word : "").toUpperCase()}".`;
  } else if (g.status === "lost") {
    el.resultBanner.className = "resultBanner lost";
    el.resultText.textContent = `⏱ Out of attempts. The word was "${(g.secretWord || "").toUpperCase()}".`;
  }

  if ((g.status === "won" || g.status === "lost") && g.autoContinue) {
    el.autoContinueNote.hidden = false;
    el.autoContinueNote.textContent = `Auto-continuing in ${g.autoContinueSecondsLeft}s…`;
  } else {
    el.autoContinueNote.hidden = true;
  }
}

function renderKeyboard(g) {
  const showKeyboard = g.status === "live";
  el.keyboard.style.display = showKeyboard ? "flex" : "none";
  if (!showKeyboard) return;
  el.keyboard.querySelectorAll(".key").forEach((key) => {
    const status = g.keyboardState ? g.keyboardState[key.dataset.letter] : null;
    key.className = "key" + (status ? ` ${status}` : "");
  });
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

function renderSettingsChips(state) {
  const g = state.game;
  const modeInfo = MODE_LABELS[g.mode];
  el.modeChip.textContent = `Mode: ${modeInfo.title} — ${modeInfo.desc}`;
  el.modeChip.className = `statusChip ${g.mode === "live" ? "good" : ""}`;

  const connStatus = state.diagnostics.connectionStatus;
  el.connChip.textContent = `TikTok: ${CONNECTION_LABELS[connStatus] || connStatus}`;
  el.connChip.className = `statusChip ${connStatus === "live" ? "good" : connStatus === "error" ? "bad" : ""}`;

  const liveModeApplied = g.mode === "live";
  el.connectBtn.disabled = !liveModeApplied;
  el.connectBtnBottom.disabled = !liveModeApplied;
}

function renderDiagnostics(diag) {
  const dictLabel = diag.dictionaryLoading
    ? "Loading…"
    : `${diag.dictionaryWordCount.toLocaleString()} words (${diag.dictionarySource === "full" ? "full list" : "fallback list"})`;
  const dictTone = diag.dictionaryLoading ? "warn" : diag.dictionarySource === "full" ? "good" : "bad";

  const rows = [
    ["Raw events received", diag.rawEventCount, "good"],
    ["Last received", diag.lastReceivedUser ? `${diag.lastReceivedUser}: ${diag.lastReceivedText || "(empty)"}` : "—", null],
    ["Connection status", CONNECTION_LABELS[diag.connectionStatus] || diag.connectionStatus, statusTone(diag.connectionStatus)],
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
}

function statusTone(status) {
  if (status === "live" || status === "test_mode") return "good";
  if (status === "error" || status === "disconnected") return "bad";
  if (status === "connecting" || status === "retrying") return "warn";
  return null;
}

function renderLeaderboardTab() {
  el.tabThisRound.classList.toggle("active", activeLeaderboardTab === "round");
  el.tabAllTime.classList.toggle("active", activeLeaderboardTab === "total");
  if (!lastState) return;

  const g = lastState.game;
  const list = activeLeaderboardTab === "round" ? lastState.roundLeaderboard : lastState.totalLeaderboard;

  if (g.mode === "test") {
    el.leaderboardList.innerHTML = "";
    el.leaderboardNote.hidden = false;
    el.leaderboardNote.textContent = "Test Mode scores aren't saved to the leaderboard.";
    return;
  }
  if (g.mode === "offline") {
    el.leaderboardList.innerHTML = "";
    el.leaderboardNote.hidden = false;
    el.leaderboardNote.textContent = "Offline mode is solo — there's no chat leaderboard here.";
    return;
  }

  el.leaderboardNote.hidden = true;
  if (!list || list.length === 0) {
    el.leaderboardList.innerHTML = `<li class="empty">No scores yet — guesses made in Live mode will show up here.</li>`;
    return;
  }
  el.leaderboardList.innerHTML = list
    .map((row, i) => `
      <li>
        <span class="rank">#${i + 1}</span>
        <span class="lbName">${escapeHtml(row.username)}</span>
        <span class="lbScore">${row.score}</span>
      </li>`)
    .join("");
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
