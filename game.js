// game.js — runs in the browser (host view / display view)

// ------------------------------------------------------------
// Mobile viewport fix: measure the REAL visible height with JS
// instead of trusting 100vh, which mobile browsers get wrong
// once their address bar / TikTok overlay chrome is accounted for.
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
  statusPill: document.getElementById("statusPill"),
  statusDot: document.getElementById("statusDot"),
  statusLabel: document.getElementById("statusLabel"),
  categoryLabel: document.getElementById("categoryLabel"),
  roundLabel: document.getElementById("roundLabel"),
  tiles: document.getElementById("tiles"),
  timerFill: document.getElementById("timerFill"),
  hintText: document.getElementById("hintText"),
  resultBanner: document.getElementById("resultBanner"),
  leaderboard: document.getElementById("leaderboard"),
  ticker: document.getElementById("ticker"),
  diagGrid: document.getElementById("diagGrid"),
  diagToggle: document.getElementById("diagToggle"),
  diagPanel: document.querySelector(".diagPanel"),
  controlsHandle: document.getElementById("controlsHandle"),
  controlsBody: document.getElementById("controlsBody"),
  handleArrow: document.getElementById("handleArrow"),
  tiktokUsername: document.getElementById("tiktokUsername"),
  connectBtn: document.getElementById("connectBtn"),
  testModeToggle: document.getElementById("testModeToggle"),
  difficultySelect: document.getElementById("difficultySelect"),
  startBtn: document.getElementById("startBtn"),
  skipBtn: document.getElementById("skipBtn"),
  endBtn: document.getElementById("endBtn"),
  miniStatus: document.getElementById("miniStatus")
};

// ------------------------------------------------------------
// Collapsible host-controls drawer (still sticky either way)
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

// ------------------------------------------------------------
// WebSocket connection to OUR OWN server (this is separate from
// the server's connection to TikTok — this socket just keeps the
// browser's screen in sync with the game state).
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

  socket.addEventListener("error", () => {
    socket.close();
  });
}
connectSocket();

function send(type, payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, payload }));
  } else {
    setMiniStatus("Not connected to the game server yet — try again in a moment.");
  }
}

function setMiniStatus(text) {
  el.miniStatus.textContent = text;
}

// ------------------------------------------------------------
// Control button wiring
// ------------------------------------------------------------
el.connectBtn.addEventListener("click", () => {
  const username = el.tiktokUsername.value.trim();
  if (!username) {
    setMiniStatus("Type a TikTok username first.");
    return;
  }
  el.testModeToggle.checked = false;
  send("connect_tiktok", { username });
});

el.testModeToggle.addEventListener("change", () => {
  send("set_test_mode", { enabled: el.testModeToggle.checked });
});

el.startBtn.addEventListener("click", () => {
  send("start_game", { difficulty: el.difficultySelect.value });
});

el.skipBtn.addEventListener("click", () => send("skip_word", {}));
el.endBtn.addEventListener("click", () => send("end_game", {}));

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
const STATUS_LABELS = {
  idle: "Idle",
  connecting: "Connecting…",
  retrying: "Retrying connection…",
  live: "LIVE",
  test_mode: "Test Mode",
  error: "Connection issue",
  disconnected: "Disconnected"
};

function render(state) {
  renderStatus(state.diagnostics);
  renderRound(state.game);
  renderLeaderboard(state.leaderboard);
  renderTicker(state.recentComments);
  renderDiagnostics(state.diagnostics, state.game);
}

function renderStatus(diag) {
  const status = diag.connectionStatus || "idle";
  el.statusDot.className = `status-dot ${status}`;
  el.statusLabel.textContent = STATUS_LABELS[status] || status;
}

function renderRound(g) {
  // Category / round chip
  if (g.status === "idle") {
    el.categoryLabel.textContent = "Pick a difficulty and start the show";
  } else if (g.category) {
    el.categoryLabel.textContent = `Category: ${g.category}`;
  } else {
    el.categoryLabel.textContent = "Get ready…";
  }
  el.roundLabel.textContent = g.roundNumber ? `Round ${g.roundNumber}` : "";

  // Letter tiles
  el.tiles.innerHTML = "";
  const word = g.maskedWord || "";
  if (word.length === 0 && g.status !== "idle") {
    // no-op, nothing to show yet
  }
  for (const ch of word) {
    const tile = document.createElement("div");
    tile.className = "tile" + (ch !== "_" ? " revealed" : "");
    tile.textContent = ch !== "_" ? ch : "";
    el.tiles.appendChild(tile);
  }

  // Timer bar
  if (g.status === "live" && g.roundSeconds > 0) {
    const fraction = Math.min(1, g.secondsElapsed / g.roundSeconds);
    el.timerFill.style.width = `${(1 - fraction) * 100}%`;
    el.timerFill.classList.toggle("urgent", fraction > 0.75);
  } else {
    el.timerFill.style.width = g.status === "idle" ? "0%" : "100%";
    el.timerFill.classList.remove("urgent");
  }

  // Hint text
  el.hintText.textContent = g.hintText ? `Hint: ${g.hintText}` : "";

  // Result banner
  if (g.lastRoundResult) {
    el.resultBanner.hidden = false;
    if (g.lastRoundResult.winner) {
      el.resultBanner.className = "resultBanner win";
      el.resultBanner.textContent = `🎉 ${g.lastRoundResult.winner} guessed "${g.lastRoundResult.word}" for ${g.lastRoundResult.score} points!`;
    } else {
      el.resultBanner.className = "resultBanner timeout";
      el.resultBanner.textContent = `⏱ Time's up! The word was "${g.lastRoundResult.word}".`;
    }
  } else {
    el.resultBanner.hidden = true;
  }
}

function renderLeaderboard(list) {
  if (!list || list.length === 0) {
    el.leaderboard.innerHTML = `<li class="empty">Scores will show up here once the game starts.</li>`;
    return;
  }
  el.leaderboard.innerHTML = list
    .map(
      (row, i) => `
      <li>
        <span class="rank">#${i + 1}</span>
        <span class="lbName">${escapeHtml(row.username)}</span>
        <span class="lbScore">${row.score}</span>
      </li>`
    )
    .join("");
}

function renderTicker(comments) {
  if (!comments || comments.length === 0) {
    el.ticker.innerHTML = `<li class="empty">Waiting for chat to arrive…</li>`;
    return;
  }
  el.ticker.innerHTML = comments
    .map(
      (c) => `<li><span class="tkUser">${escapeHtml(c.username)}</span><span class="tkText">${escapeHtml(c.text)}</span></li>`
    )
    .join("");
}

function renderDiagnostics(diag, g) {
  const rows = [
    ["Raw events received", diag.rawEventCount, "good"],
    [
      "Last received",
      diag.lastReceivedUser ? `${diag.lastReceivedUser}: ${diag.lastReceivedText || "(empty)"}` : "—",
      null
    ],
    ["Connection status", STATUS_LABELS[diag.connectionStatus] || diag.connectionStatus, statusTone(diag.connectionStatus)],
    ["Signing key set up?", diag.signKeyConfigured ? "Yes" : "No — see setup guide", diag.signKeyConfigured ? "good" : "bad"],
    ["Retry attempts", `${diag.retryAttempt} / ${diag.maxRetries}`, diag.retryAttempt > 0 ? "warn" : null],
    ["Last message", diag.lastErrorMessage || "—", diag.lastErrorMessage ? "bad" : null]
  ];

  el.diagGrid.innerHTML = rows
    .map(
      ([key, val, tone]) => `
      <div class="diagRow">
        <span class="diagKey">${escapeHtml(key)}</span>
        <span class="diagVal ${tone || ""}">${escapeHtml(String(val))}</span>
      </div>`
    )
    .join("");

  // Keep the Connect button and username field in sync with reality.
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
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
