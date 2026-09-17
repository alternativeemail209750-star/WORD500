// game.js — runs in the browser (host view / display view)

function setRealViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
setRealViewportHeight();
window.addEventListener("resize", setRealViewportHeight);
window.addEventListener("resize", () => {
  lastTilesSignature = "";
  if (lastState) renderTiles(lastState.game);
});
window.addEventListener("orientationchange", setRealViewportHeight);
window.addEventListener("orientationchange", () => {
  lastTilesSignature = "";
  if (lastState) renderTiles(lastState.game);
});

const el = {
  brandDot: document.getElementById("brandDot"),
  modeBadge: document.getElementById("modeBadge"),
  lengthBadge: document.getElementById("lengthBadge"),
  hintBtn: document.getElementById("hintBtn"),
  helpBtn: document.getElementById("helpBtn"),
  leaderboardBtn: document.getElementById("leaderboardBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),

  confettiLayer: document.getElementById("confettiLayer"),
  rejectionToast: document.getElementById("rejectionToast"),

  tilesWrap: document.getElementById("tilesWrap"),
  hintChips: document.getElementById("hintChips"),
  hintExplainer: document.getElementById("hintExplainer"),
  offlineNote: document.getElementById("offlineNote"),
  resultBanner: document.getElementById("resultBanner"),
  resultText: document.getElementById("resultText"),
  playAgainBtn: document.getElementById("playAgainBtn"),
  autoContinueNote: document.getElementById("autoContinueNote"),
  idleBanner: document.getElementById("idleBanner"),
  resetColorsBtn: document.getElementById("resetColorsBtn"),
  keyboardSection: document.getElementById("keyboardSection"),
  keyboard: document.getElementById("keyboard"),

  controlsHandle: document.getElementById("controlsHandle"),
  controlsBody: document.getElementById("controlsBody"),
  liveControls: document.getElementById("liveControls"),
  testControls: document.getElementById("testControls"),
  offlineControls: document.getElementById("offlineControls"),
  tiktokUsernameBottom: document.getElementById("tiktokUsernameBottom"),
  connectBtnBottom: document.getElementById("connectBtnBottom"),
  setAnswerInputLive: document.getElementById("setAnswerInputLive"),
  setAnswerBtnLive: document.getElementById("setAnswerBtnLive"),
  setAnswerErrorLive: document.getElementById("setAnswerErrorLive"),
  setAnswerInputTest: document.getElementById("setAnswerInputTest"),
  setAnswerBtnTest: document.getElementById("setAnswerBtnTest"),
  setAnswerErrorTest: document.getElementById("setAnswerErrorTest"),
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
  difficultySelect: document.getElementById("difficultySelect"),
  autoContinueToggle: document.getElementById("autoContinueToggle"),
  delayInput: document.getElementById("delayInput"),
  leaderboardShowInput: document.getElementById("leaderboardShowInput"),
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
// Fullscreen toggle (cross-browser, with graceful no-op fallback
// on browsers - notably iOS Safari - that don't support it)
// ------------------------------------------------------------
function isFullscreen() {
  return Boolean(
    document.fullscreenElement || document.webkitFullscreenElement ||
    document.mozFullScreenElement || document.msFullscreenElement
  );
}
function requestFS() {
  const root = document.documentElement;
  const fn = root.requestFullscreen || root.webkitRequestFullscreen || root.mozRequestFullScreen || root.msRequestFullscreen;
  if (!fn) return;
  try {
    const p = fn.call(root);
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* ignore - not supported here */ }
}
function exitFS() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
  if (!fn) return;
  try {
    const p = fn.call(document);
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* ignore */ }
}
el.fullscreenBtn.addEventListener("click", () => {
  if (isFullscreen()) exitFS();
  else requestFS();
});
["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach((evt) => {
  document.addEventListener(evt, () => {
    const fs = isFullscreen();
    el.fullscreenBtn.classList.toggle("active", fs);
    el.fullscreenBtn.setAttribute("aria-label", fs ? "Exit fullscreen" : "Enter fullscreen");
    setRealViewportHeight();
    lastTilesSignature = "";
    if (lastState) renderTiles(lastState.game);
  });
});

// ------------------------------------------------------------
// Manual, host-only scratchpad coloring
// ------------------------------------------------------------
const CYCLE = [null, "absent", "present", "correct"];
let manualKeyColors = {};
let manualTileColors = {};

function nextColor(current) {
  const idx = CYCLE.indexOf(current || null);
  return CYCLE[(idx + 1) % CYCLE.length];
}

function cycleKeyColor(letter) {
  const next = nextColor(manualKeyColors[letter] || null);
  if (next) manualKeyColors[letter] = next;
  else delete manualKeyColors[letter];
  paintKeyboard();
}

function cycleTileColor(key) {
  const next = nextColor(manualTileColors[key] || null);
  if (next) manualTileColors[key] = next;
  else delete manualTileColors[key];
  lastTilesSignature = "";
  if (lastState) renderTiles(lastState.game);
}

function resetManualColors() {
  manualKeyColors = {};
  manualTileColors = {};
  paintKeyboard();
  lastTilesSignature = "";
  if (lastState) renderTiles(lastState.game);
}

function paintKeyboard() {
  const usedLetters = new Set((lastState && lastState.game && lastState.game.usedLetters) || []);
  el.keyboard.querySelectorAll(".key").forEach((key) => {
    const letter = key.dataset.letter;
    const manual = manualKeyColors[letter];
    let cls = "key";
    if (manual) cls += " " + manual;
    else if (usedLetters.has(letter)) cls += " used";
    key.className = cls;
  });
}

// Two balanced rows of 13, alphabetical - easy to scan as a deduction
// board rather than a typing keyboard (nobody types on this; it's a
// host-only click-to-mark scratchpad).
const KEYBOARD_ROWS = [
  ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"],
  ["n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]
];
for (const row of KEYBOARD_ROWS) {
  const rowEl = document.createElement("div");
  rowEl.className = "keyRow";
  for (const letter of row) {
    const key = document.createElement("div");
    key.className = "key";
    key.dataset.letter = letter;
    key.textContent = letter;
    key.addEventListener("click", () => cycleKeyColor(letter));
    rowEl.appendChild(key);
  }
  el.keyboard.appendChild(rowEl);
}
function applyKeyMetrics(metrics) {
  el.keyboard.querySelectorAll(".key").forEach((key) => {
    key.style.width = metrics.tileSize + "px";
    key.style.height = metrics.tileHeight + "px";
    key.style.fontSize = metrics.fontSize + "px";
  });
}

el.resetColorsBtn.addEventListener("click", resetManualColors);

for (let n = 4; n <= 20; n++) {
  const opt = document.createElement("option");
  opt.value = String(n);
  opt.textContent = n + " letters";
  if (n === 5) opt.selected = true;
  el.wordLengthSelect.appendChild(opt);
}

let stagedMode = "test";

function syncStagedSettingsFromState(g) {
  stagedMode = g.mode;
  el.wordLengthSelect.value = String(g.wordLength);
  el.difficultySelect.value = g.difficulty;
  el.autoContinueToggle.checked = g.autoContinue;
  el.delayInput.value = g.autoContinueDelaySeconds;
  el.leaderboardShowInput.value = g.leaderboardShowSeconds;
  updateModePickerLabel();
}

function updateModePickerLabel() {
  const info = MODE_LABELS[stagedMode];
  el.modePickerLabel.textContent = info.title + " — " + info.desc;
  document.querySelectorAll(".pickerOption").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.mode === stagedMode);
  });
}

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

let socket = null;
let reconnectDelay = 1000;
let lastState = null;

function connectSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(protocol + "//" + window.location.host);

  socket.addEventListener("open", () => {
    reconnectDelay = 1000;
    setMiniStatus("Connected to game server.");
  });

  socket.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "state") render(msg.payload);
      else if (msg.type === "offline_guess_result") handleOfflineGuessResult(msg.payload);
      else if (msg.type === "set_secret_word_result") handleSetAnswerResult(msg.payload);
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
    socket.send(JSON.stringify({ type: type, payload: payload }));
  } else {
    setMiniStatus("Not connected to the game server yet — try again in a moment.");
  }
}
function setMiniStatus(text) { el.miniStatus.textContent = text; }

function doConnect(usernameInput) {
  const username = usernameInput.value.trim();
  if (!username) { setMiniStatus("Type a TikTok username first."); return; }
  send("connect_tiktok", { username: username });
}
el.connectBtn.addEventListener("click", () => doConnect(el.tiktokUsername));
el.connectBtnBottom.addEventListener("click", () => doConnect(el.tiktokUsernameBottom));
el.disconnectBtn.addEventListener("click", () => send("disconnect_tiktok", {}));

el.applyBtn.addEventListener("click", () => {
  send("apply_settings", {
    mode: stagedMode,
    wordLength: Number(el.wordLengthSelect.value),
    difficulty: el.difficultySelect.value,
    autoContinue: el.autoContinueToggle.checked,
    autoContinueDelaySeconds: Number(el.delayInput.value) || 3
  });
  closeDrawer(el.settingsOverlay);
});

// Leaderboard-show duration applies immediately, without restarting
// the round (unlike the rest of Settings, which is bundled behind
// the "Apply & start new round" button above).
el.leaderboardShowInput.addEventListener("change", () => {
  send("set_leaderboard_show_seconds", { seconds: Number(el.leaderboardShowInput.value) || 3 });
});

el.playAgainBtn.addEventListener("click", () => send("play_again", {}));
el.giveUpBtn.addEventListener("click", () => send("give_up", {}));
el.hintBtn.addEventListener("click", () => send("use_hint", {}));

el.resetRoundBtn.addEventListener("click", () => send("reset_round_leaderboard", {}));
el.resetTotalBtn.addEventListener("click", () => send("reset_total_leaderboard", {}));

let pendingSetAnswerSource = null;
function submitSetAnswer(source, inputEl) {
  const word = inputEl.value.trim();
  if (!word) return;
  pendingSetAnswerSource = source;
  send("set_secret_word", { word: word });
}
el.setAnswerBtnLive.addEventListener("click", () => submitSetAnswer("live", el.setAnswerInputLive));
el.setAnswerInputLive.addEventListener("keydown", (e) => { if (e.key === "Enter") submitSetAnswer("live", el.setAnswerInputLive); });
el.setAnswerBtnTest.addEventListener("click", () => submitSetAnswer("test", el.setAnswerInputTest));
el.setAnswerInputTest.addEventListener("keydown", (e) => { if (e.key === "Enter") submitSetAnswer("test", el.setAnswerInputTest); });

function handleSetAnswerResult(result) {
  const errorEl = pendingSetAnswerSource === "test" ? el.setAnswerErrorTest : el.setAnswerErrorLive;
  const inputEl = pendingSetAnswerSource === "test" ? el.setAnswerInputTest : el.setAnswerInputLive;
  if (result.ok) {
    errorEl.textContent = "";
    inputEl.value = "";
  } else {
    errorEl.textContent = result.error || "Couldn't set that word.";
  }
}

function submitOfflineGuess() {
  const word = el.offlineGuessInput.value.trim();
  if (!word) return;
  send("submit_offline_guess", { word: word });
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
// Rejection toast - brief but readable, auto-dismissing
// ------------------------------------------------------------
let lastShownRejectionAt = 0;
let rejectionHideTimer = null;
function maybeShowRejection(g) {
  if (!g.lastRejection || g.lastRejection.at <= lastShownRejectionAt) return;
  lastShownRejectionAt = g.lastRejection.at;

  el.rejectionToast.textContent = "✗ " + g.lastRejection.word.toUpperCase() + " — " + g.lastRejection.reason;
  el.rejectionToast.hidden = false;
  el.rejectionToast.style.animation = "none";
  void el.rejectionToast.offsetWidth;
  el.rejectionToast.style.animation = "";

  clearTimeout(rejectionHideTimer);
  rejectionHideTimer = setTimeout(() => { el.rejectionToast.hidden = true; }, 2400);
}

// ------------------------------------------------------------
// Win celebration: confetti + winner callout + auto-popup leaderboard
// ------------------------------------------------------------
const CONFETTI_COLORS = ["#ffb100", "#ff3b4e", "#16d976", "#7c5cff", "#f6f4ef"];
function spawnConfetti() {
  const count = 70;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confettiPiece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const duration = 1.6 + Math.random() * 1.3;
    piece.style.animationDuration = duration + "s";
    piece.style.animationDelay = (Math.random() * 0.3) + "s";
    el.confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), (duration + 0.6) * 1000);
  }
}

let winLeaderboardTimer = null;
function triggerWinCelebration(g) {
  spawnConfetti();
  activeLeaderboardTab = "round";
  openDrawer(el.leaderboardOverlay);
  renderLeaderboardTab();
  const seconds = g.leaderboardShowSeconds || 3;
  clearTimeout(winLeaderboardTimer);
  winLeaderboardTimer = setTimeout(() => { closeDrawer(el.leaderboardOverlay); }, seconds * 1000);
}

let wasWon = false;
function detectWinTransition(g) {
  const isWon = g.status === "won";
  if (isWon && !wasWon) triggerWinCelebration(g);
  wasWon = isWon;
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
const CONNECTION_LABELS = {
  idle: "Idle", connecting: "Connecting…", retrying: "Retrying…",
  live: "LIVE", test_mode: "Simulating (Test Mode)", error: "Connection issue", disconnected: "Disconnected"
};

let lastTilesSignature = "";
let wasFreshRoundStart = false;

function render(state) {
  lastState = state;
  detectFreshRound(state.game);
  detectWinTransition(state.game);
  renderHeader(state);
  renderModeUI(state.game);
  renderLengthBadge(state.game);
  renderTiles(state.game);
  renderHintChips(state.game);
  renderModeNotes(state.game);
  renderBanners(state.game);
  renderKeyboardVisibility(state.game);
  paintKeyboard();
  maybeShowRejection(state.game);
  renderSettingsChips(state);
  renderDiagnostics(state.diagnostics);
  if (!el.leaderboardOverlay.hidden) renderLeaderboardTab();
}

function detectFreshRound(g) {
  const isFreshRoundStart = g.status === "live" && g.guessesMade === 0;
  if (isFreshRoundStart && !wasFreshRoundStart) resetManualColors();
  wasFreshRoundStart = isFreshRoundStart;
}

function renderHeader(state) {
  const connStatus = state.diagnostics.connectionStatus || "idle";
  el.brandDot.className = "brandDot " + (state.game.mode === "test" ? "test_mode" : connStatus);
  el.modeBadge.textContent = state.game.mode.toUpperCase();
  el.modeBadge.className = "modeBadge " + state.game.mode;
  el.hintBtn.disabled = state.game.status !== "live";
}

function renderModeUI(g) {
  el.liveControls.hidden = g.mode !== "live";
  el.testControls.hidden = g.mode !== "test";
  el.offlineControls.hidden = g.mode !== "offline";
}

function renderLengthBadge(g) {
  el.lengthBadge.textContent = g.status === "idle" ? "— letters" : g.wordLength + " letters";
}

// Tile sizing combines two constraints so guesses always sit on one
// line AND every guess made this round is visible without scrolling:
//   - width:  sized as if the word were at least 17 letters long, so
//             sizing stays visually consistent across rounds instead
//             of ballooning for short words
//   - height: shrinks further if there are enough guess rows that
//             they wouldn't otherwise all fit in the visible area
// The keyboard is sized to match exactly (see applyKeyMetrics).
function computeAvailableTilesHeight() {
  const viewportH = window.innerHeight;
  const top = el.tilesWrap.getBoundingClientRect().top;
  const reserveBelow = 230; // banners, footer controls, safety margin
  return Math.max(80, viewportH - top - reserveBelow);
}

function computeTileMetrics(wordLength, rowCount) {
  const containerWidth = el.tilesWrap.clientWidth || 320;
  // effectiveLength is always >= 17, so every word length from 4-17
  // resolves to the exact same width-based tile size - the "as if it
  // were a 17-letter word" baseline. Lengths beyond 17 shrink further.
  const effectiveLength = Math.max(wordLength, 17);
  const countsReserve = 30;
  const hGap = 2;
  const usableWidth = Math.max(100, containerWidth - countsReserve);
  let tileSizeByWidth = Math.floor((usableWidth - hGap * (effectiveLength - 1)) / effectiveLength);
  tileSizeByWidth = Math.max(8, Math.min(40, tileSizeByWidth));

  const availableHeight = computeAvailableTilesHeight();
  const vGap = 8;
  const rows = Math.max(1, rowCount);
  const rowHeightBudget = Math.floor((availableHeight - vGap * (rows - 1)) / rows);
  let tileSizeByHeight = Math.floor(rowHeightBudget / 1.18);
  tileSizeByHeight = Math.max(8, Math.min(40, tileSizeByHeight));

  const tileSize = Math.max(8, Math.min(tileSizeByWidth, tileSizeByHeight));
  const tileHeight = Math.round(tileSize * 1.18);
  const fontSize = Math.max(7, Math.round(tileSize * 0.42));
  return { tileSize, tileHeight, fontSize, gap: hGap, tight: true };
}

function buildGuessBlock(guess, wordLength, metrics) {
  const block = document.createElement("div");
  block.className = "guessBlock";

  const rowEl = document.createElement("div");
  rowEl.className = "tileRow";
  rowEl.style.gap = metrics.gap + "px";
  for (let c = 0; c < wordLength; c++) {
    const tile = document.createElement("div");
    tile.style.width = metrics.tileSize + "px";
    tile.style.height = metrics.tileHeight + "px";
    tile.style.fontSize = metrics.fontSize + "px";
    if (guess) {
      const key = guess.word + "_" + c;
      const manual = manualTileColors[key];
      tile.className = "tile filled" + (manual ? " " + manual : "");
      tile.textContent = guess.word[c];
      tile.addEventListener("click", () => cycleTileColor(key));
    } else {
      tile.className = "tile current";
    }
    rowEl.appendChild(tile);
  }
  block.appendChild(rowEl);

  if (guess) {
    const countsCol = document.createElement("div");
    countsCol.className = "countsCol" + (metrics.tight ? " tight" : "");
    countsCol.innerHTML =
      '<span class="countBadge green">' + guess.counts.green + "</span>" +
      '<span class="countBadge gold">' + guess.counts.yellow + "</span>" +
      '<span class="countBadge red">' + guess.counts.red + "</span>";
    block.appendChild(countsCol);
  }

  return block;
}

function renderTiles(g) {
  const signature = g.status + "|" + g.wordLength + "|" + g.guessesMade;
  if (signature === lastTilesSignature) return;
  lastTilesSignature = signature;

  el.tilesWrap.innerHTML = "";
  if (g.status === "idle") return;

  const rowCount = g.guesses.length + (g.status === "live" ? 1 : 0);
  const metrics = computeTileMetrics(g.wordLength, rowCount);
  applyKeyMetrics(metrics);

  if (g.status === "live") {
    el.tilesWrap.appendChild(buildGuessBlock(null, g.wordLength, metrics));
  }
  const reversed = g.guesses.slice().reverse();
  reversed.forEach((guess) => {
    el.tilesWrap.appendChild(buildGuessBlock(guess, g.wordLength, metrics));
  });
}

function renderHintChips(g) {
  const hasHints = g.hintSuggestions && g.hintSuggestions.length > 0;
  el.hintExplainer.hidden = !hasHints;
  if (!hasHints) {
    el.hintChips.innerHTML = "";
    return;
  }
  el.hintChips.innerHTML = g.hintSuggestions
    .map((word) => '<span class="hintChip">Try: ' + escapeHtml(word.toUpperCase()) + "</span>")
    .join("");
}

function renderModeNotes(g) {
  el.offlineNote.hidden = !(g.status === "live" && g.mode === "offline");
}

function renderBanners(g) {
  el.idleBanner.hidden = g.status !== "idle";
  el.resultBanner.hidden = g.status !== "won" && g.status !== "lost";

  if (g.status === "won") {
    const lastGuess = g.guesses[g.guesses.length - 1];
    const word = (g.lastWinInfo && g.lastWinInfo.word) || (lastGuess && lastGuess.word) || "";
    el.resultBanner.className = "resultBanner win";
    if (g.lastWinInfo && g.lastWinInfo.username) {
      const pointsPart = typeof g.lastWinInfo.points === "number" ? " — +" + g.lastWinInfo.points + " points" : "";
      el.resultText.textContent = "🎉 " + g.lastWinInfo.username + ' solved it! "' + word.toUpperCase() + '"' + pointsPart;
    } else {
      el.resultText.textContent = '🎉 Solved it! The word was "' + word.toUpperCase() + '".';
    }
  } else if (g.status === "lost") {
    el.resultBanner.className = "resultBanner lost";
    el.resultText.textContent = '⏱ Round ended. The word was "' + ((g.secretWord || "").toUpperCase()) + '".';
  }

  if ((g.status === "won" || g.status === "lost") && g.autoContinue) {
    el.autoContinueNote.hidden = false;
    el.autoContinueNote.textContent = "Auto-continuing in " + g.autoContinueSecondsLeft + "s…";
  } else {
    el.autoContinueNote.hidden = true;
  }
}

function renderKeyboardVisibility(g) {
  el.keyboardSection.style.display = g.status === "live" ? "block" : "none";
}

function renderSettingsChips(state) {
  const g = state.game;
  const modeInfo = MODE_LABELS[g.mode];
  el.modeChip.textContent = "Mode: " + modeInfo.title + " — " + modeInfo.desc;
  el.modeChip.className = "statusChip " + (g.mode === "live" ? "good" : "");

  const connStatus = state.diagnostics.connectionStatus;
  el.connChip.textContent = "TikTok: " + (CONNECTION_LABELS[connStatus] || connStatus);
  el.connChip.className = "statusChip " + (connStatus === "live" ? "good" : connStatus === "error" ? "bad" : "");

  const liveModeApplied = g.mode === "live";
  el.connectBtn.disabled = !liveModeApplied;
  el.connectBtnBottom.disabled = !liveModeApplied;
}

function renderDiagnostics(diag) {
  const dictLabel = diag.dictionaryLoading
    ? "Loading…"
    : diag.dictionaryWordCount.toLocaleString() + " words (" + (diag.dictionarySource === "full" ? "full list" : "fallback list") + ")";
  const dictTone = diag.dictionaryLoading ? "warn" : diag.dictionarySource === "full" ? "good" : "bad";

  const rows = [
    ["Raw events received", diag.rawEventCount, "good"],
    ["Last received", diag.lastReceivedUser ? diag.lastReceivedUser + ": " + (diag.lastReceivedText || "(empty)") : "—", null],
    ["Connection status", CONNECTION_LABELS[diag.connectionStatus] || diag.connectionStatus, statusTone(diag.connectionStatus)],
    ["Signing key set up?", diag.signKeyConfigured ? "Yes" : "No — see setup guide", diag.signKeyConfigured ? "good" : "bad"],
    ["Word dictionary", dictLabel, dictTone],
    ["Retry attempts", diag.retryAttempt + " / " + diag.maxRetries, diag.retryAttempt > 0 ? "warn" : null],
    ["Last message", diag.lastErrorMessage || "—", diag.lastErrorMessage ? "bad" : null]
  ];

  el.diagGrid.innerHTML = rows
    .map(([key, val, tone]) =>
      '<div class="diagRow"><span class="diagKey">' + escapeHtml(key) + '</span><span class="diagVal ' + (tone || "") + '">' + escapeHtml(String(val)) + "</span></div>"
    )
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
    el.leaderboardList.innerHTML = '<li class="empty">No scores yet — guesses made in Live mode will show up here.</li>';
    return;
  }
  el.leaderboardList.innerHTML = list
    .map((row, i) =>
      '<li><span class="rank">#' + (i + 1) + '</span><span class="lbName">' + escapeHtml(row.username) + '</span><span class="lbScore">' + row.score + "</span></li>"
    )
    .join("");
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
