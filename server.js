// server.js
// WORD500 - a live word-guessing game show driven by TikTok LIVE chat.
//
// Read this file top-to-bottom once and you'll understand the whole app:
//   1. Safety net (crash protection)              -> SAFETY NET
//   2. Turning any raw chat event into {user,text} -> FIELD EXTRACTION
//   3. The game itself (rounds, scoring, hints)    -> GAME STATE
//   4. Talking to TikTok (connect + retry + test)  -> TIKTOK CONNECTION
//   5. Talking to the browser (WebSocket)          -> WEBSOCKET SERVER
//
// You should never need to edit this file to run the game - everything
// you're likely to want to change (words, colors, timings) lives in
// words.js or public/style.css. This file is only here so you (or a
// future helper) can see exactly how it works.

import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { TikTokLiveConnection, WebcastEvent, SignConfig } from "tiktok-live-connector";
import { ALL_WORDS, WORD_BANK } from "./words.js";

// ============================================================
// SAFETY NET - one bad message must never take the whole app down
// ============================================================
process.on("uncaughtException", (err) => {
  console.error("[SAFETY-NET] Uncaught exception (server keeps running):", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[SAFETY-NET] Unhandled rejection (server keeps running):", reason);
});

function safely(label, fn) {
  // Wraps any event handler so a crash inside it only logs an error
  // instead of bringing down the game for everyone else watching.
  return (...args) => {
    try {
      fn(...args);
    } catch (err) {
      console.error(`[SAFETY-NET] Error inside "${label}" handler:`, err);
    }
  };
}

// ============================================================
// FIELD EXTRACTION - never trust one hardcoded field name
// ============================================================
// tiktok-live-connector is a reverse-engineered library. TikTok can
// change the shape of its data at any time, and library versions drift
// from their own docs. Instead of reading data.comment directly, we
// walk a list of every plausible field name/path and use the first one
// that actually has a value. If TikTok changes shape again, add a new
// path to these lists - you don't need to change any other code.

function getByPath(obj, dottedPath) {
  const parts = dottedPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function extractField(raw, candidatePaths, fallback) {
  for (const p of candidatePaths) {
    const value = getByPath(raw, p);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

const USERNAME_PATHS = [
  "uniqueId",
  "uniqueid",
  "user.uniqueId",
  "user.uniqueid",
  "user.username",
  "username",
  "nickname",
  "user.nickname",
  "author.uniqueId",
  "author.nickname",
  "data.uniqueId"
];

const MESSAGE_PATHS = [
  "comment",
  "message",
  "content",
  "text",
  "msg",
  "data.comment",
  "data.message"
];

function extractChatFields(raw) {
  const username = String(extractField(raw, USERNAME_PATHS, "viewer"));
  const text = String(extractField(raw, MESSAGE_PATHS, ""));
  return { username, text };
}

// Turns "  Tiger!! " into "tiger" so guesses match even with punctuation,
// emoji-adjacent spaces, or stray capitalization from mobile keyboards.
function normalizeGuess(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z]/g, "")
    .trim();
}

// ============================================================
// GAME STATE - rounds, scoring, hints
// ============================================================
const ROUND_SECONDS = 45;
const BASE_SCORE = 500;
const MIN_SCORE = 50;
const NEXT_ROUND_DELAY_MS = 5000;
const HINT_SCHEDULE_SECONDS = [15, 30, 40]; // fun fact, first letter, extra letter

const game = {
  status: "idle", // idle | countdown | live | round_end | finished
  difficulty: "mixed", // easy | medium | hard | mixed
  currentWord: null, // { word, category, hint, difficulty }
  revealedLetters: [], // booleans, one per letter of currentWord.word
  hintsRevealed: 0,
  roundStartedAt: null,
  roundNumber: 0,
  lastRoundResult: null, // { winner, word, score } | { timedOut, word }
  scores: new Map(), // username -> score
  recentComments: [], // last N raw comments, newest first
  usedWords: new Set()
};

function pickWord(difficulty) {
  const pool = difficulty === "mixed" ? ALL_WORDS : WORD_BANK[difficulty] || ALL_WORDS;
  const unused = pool.filter((w) => !game.usedWords.has(w.word));
  const list = unused.length > 0 ? unused : pool; // reshuffle once exhausted
  if (unused.length === 0) game.usedWords.clear();
  const pick = list[Math.floor(Math.random() * list.length)];
  game.usedWords.add(pick.word);
  return pick;
}

function startRound() {
  const word = pickWord(game.difficulty);
  game.currentWord = word;
  game.revealedLetters = word.word.split("").map(() => false);
  game.hintsRevealed = 0;
  game.roundStartedAt = Date.now();
  game.roundNumber += 1;
  game.status = "live";
  game.lastRoundResult = null;
  broadcastState();
}

function endGame() {
  clearInterval(roundTimer);
  game.status = "idle";
  game.currentWord = null;
  game.roundStartedAt = null;
  game.lastRoundResult = null;
  broadcastState();
}

function revealLetterHint(count) {
  const letters = game.currentWord.word.split("");
  let revealed = 0;
  const positions = letters
    .map((_, i) => i)
    .filter((i) => !game.revealedLetters[i]);
  // Always reveal the first letter first, then randomize the rest.
  positions.sort((a, b) => {
    if (a === 0) return -1;
    if (b === 0) return 1;
    return Math.random() - 0.5;
  });
  for (const pos of positions) {
    if (revealed >= count) break;
    game.revealedLetters[pos] = true;
    revealed++;
  }
}

function computeScore(elapsedSeconds) {
  const remainingFraction = Math.max(0, (ROUND_SECONDS - elapsedSeconds) / ROUND_SECONDS);
  const timeScore = Math.round(BASE_SCORE * remainingFraction);
  const penalty = game.hintsRevealed * 50;
  return Math.max(MIN_SCORE, timeScore - penalty);
}

function awardWin(username) {
  const elapsedSeconds = (Date.now() - game.roundStartedAt) / 1000;
  const score = computeScore(elapsedSeconds);
  const prior = game.scores.get(username) || 0;
  game.scores.set(username, prior + score);
  game.lastRoundResult = { winner: username, word: game.currentWord.word, score };
  game.revealedLetters = game.currentWord.word.split("").map(() => true);
  game.status = "round_end";
  broadcastState();
  setTimeout(() => {
    if (game.status === "round_end") startRound();
  }, NEXT_ROUND_DELAY_MS);
}

function timeoutRound() {
  game.lastRoundResult = { timedOut: true, word: game.currentWord.word };
  game.revealedLetters = game.currentWord.word.split("").map(() => true);
  game.status = "round_end";
  broadcastState();
  setTimeout(() => {
    if (game.status === "round_end") startRound();
  }, NEXT_ROUND_DELAY_MS);
}

// Ticks once a second while a round is live: reveals hints on schedule
// and ends the round if time runs out.
let roundTimer = setInterval(
  safely("round-timer-tick", () => {
    if (game.status !== "live" || !game.roundStartedAt) return;
    const elapsed = Math.floor((Date.now() - game.roundStartedAt) / 1000);

    const hintsThatShouldBeRevealed = HINT_SCHEDULE_SECONDS.filter((t) => elapsed >= t).length;
    if (hintsThatShouldBeRevealed > game.hintsRevealed) {
      // Hint index 0 = the fun-fact hint text, indices 1+ = letter reveals.
      const newlyRevealed = hintsThatShouldBeRevealed - game.hintsRevealed;
      const letterHintsBefore = Math.max(0, game.hintsRevealed - 1);
      const letterHintsAfter = Math.max(0, hintsThatShouldBeRevealed - 1);
      if (letterHintsAfter > letterHintsBefore) {
        revealLetterHint(letterHintsAfter - letterHintsBefore);
      }
      game.hintsRevealed = hintsThatShouldBeRevealed;
    }

    if (elapsed >= ROUND_SECONDS) {
      timeoutRound();
    } else {
      broadcastState(true); // lightweight tick, just for the countdown display
    }
  }),
  1000
);

function checkGuess(username, rawText) {
  if (game.status !== "live" || !game.currentWord) return;
  const guess = normalizeGuess(rawText);
  if (guess.length === 0) return;
  if (guess === game.currentWord.word) {
    awardWin(username);
  }
}

function getLeaderboard() {
  return [...game.scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([username, score]) => ({ username, score }));
}

function getMaskedWord() {
  if (!game.currentWord) return null;
  return game.currentWord.word
    .split("")
    .map((letter, i) => (game.revealedLetters[i] ? letter : "_"))
    .join("");
}

// ============================================================
// DIAGNOSTICS - always-on, on-screen proof that things are working
// ============================================================
const diagnostics = {
  rawEventCount: 0,
  lastReceivedUser: null,
  lastReceivedText: null,
  lastReceivedAt: null,
  connectionStatus: "idle", // idle | connecting | retrying | live | test_mode | error | disconnected
  retryAttempt: 0,
  maxRetries: 3,
  lastErrorMessage: null,
  signKeyConfigured: Boolean(process.env.EULERSTREAM_API_KEY),
  tiktokUsername: null
};

function handleIncomingRawEvent(raw) {
  diagnostics.rawEventCount += 1;
  const { username, text } = extractChatFields(raw);
  diagnostics.lastReceivedUser = username;
  diagnostics.lastReceivedText = text;
  diagnostics.lastReceivedAt = Date.now();

  game.recentComments.unshift({ username, text, at: Date.now() });
  if (game.recentComments.length > 30) game.recentComments.length = 30;

  checkGuess(username, text);
  broadcastState();
}

// ============================================================
// TIKTOK CONNECTION - required signing key, retry with backoff
// ============================================================
let liveConnection = null;
let testModeTimer = null;
const RETRY_DELAYS_MS = [2000, 4000, 8000];

if (process.env.EULERSTREAM_API_KEY) {
  SignConfig.apiKey = process.env.EULERSTREAM_API_KEY;
}

function stopEverything() {
  if (liveConnection) {
    try {
      liveConnection.disconnect();
    } catch (err) {
      console.error("[SAFETY-NET] Error while disconnecting:", err);
    }
    liveConnection = null;
  }
  if (testModeTimer) {
    clearInterval(testModeTimer);
    testModeTimer = null;
  }
}

async function connectToTikTok(username) {
  if (!diagnostics.signKeyConfigured) {
    diagnostics.connectionStatus = "error";
    diagnostics.lastErrorMessage =
      "No signing key set up yet. Add EULERSTREAM_API_KEY in Render before connecting.";
    broadcastState();
    return;
  }

  stopEverything();
  diagnostics.tiktokUsername = username;
  diagnostics.connectionStatus = "connecting";
  diagnostics.retryAttempt = 0;
  diagnostics.lastErrorMessage = null;
  broadcastState();

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const connection = new TikTokLiveConnection(username, {
        signApiKey: process.env.EULERSTREAM_API_KEY
      });

      connection.on(
        WebcastEvent.CHAT,
        safely("chat-event", (data) => handleIncomingRawEvent(data))
      );
      connection.on(
        WebcastEvent.DISCONNECTED,
        safely("disconnected-event", () => {
          diagnostics.connectionStatus = "disconnected";
          broadcastState();
        })
      );
      connection.on(
        WebcastEvent.ERROR,
        safely("error-event", (err) => {
          console.error("[TikTok] connection error event:", err);
        })
      );
      connection.on(
        WebcastEvent.STREAM_END,
        safely("stream-end-event", () => {
          diagnostics.connectionStatus = "disconnected";
          diagnostics.lastErrorMessage = "The TikTok LIVE broadcast ended.";
          broadcastState();
        })
      );

      await connection.connect();
      liveConnection = connection;
      diagnostics.connectionStatus = "live";
      diagnostics.lastErrorMessage = null;
      broadcastState();
      return;
    } catch (err) {
      console.error(`[TikTok] Connect attempt ${attempt + 1} failed:`, err?.message || err);
      diagnostics.retryAttempt = attempt + 1;
      const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
      if (isLastAttempt) {
        diagnostics.connectionStatus = "error";
        diagnostics.lastErrorMessage = describeConnectError(err);
        broadcastState();
        return;
      }
      diagnostics.connectionStatus = "retrying";
      broadcastState();
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

function describeConnectError(err) {
  const message = String(err?.message || err || "").toLowerCase();
  if (message.includes("not found") || message.includes("does not exist")) {
    return "That TikTok username couldn't be found. Double-check the spelling.";
  }
  if (message.includes("offline") || message.includes("not live") || message.includes("live_not_found")) {
    return "That account doesn't look like it's LIVE right now.";
  }
  if (message.includes("sign") || message.includes("key") || message.includes("401") || message.includes("403")) {
    return "The signing key was rejected. Check that EULERSTREAM_API_KEY in Render is correct.";
  }
  return "Couldn't connect to TikTok LIVE after several tries. You can try again anytime.";
}

// ---- Test Mode: fake events, deliberately shaped a few different ways ----
const FAKE_USERNAMES = ["comet_fan", "wordwiz99", "livstream_lu", "night.owl", "byte_buddy", "quiz.queen", "pixel_pete"];
const FAKE_JUNK_WORDS = ["hi", "lol", "go team", "so fun", "love this game", "hmm", "wait what"];

function startTestMode() {
  stopEverything();
  diagnostics.connectionStatus = "test_mode";
  diagnostics.lastErrorMessage = null;
  diagnostics.tiktokUsername = null;
  broadcastState();

  testModeTimer = setInterval(
    safely("test-mode-tick", () => {
      const username = FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)];
      const shouldGuessCorrectly = game.currentWord && Math.random() < 0.12;
      const text = shouldGuessCorrectly
        ? game.currentWord.word
        : FAKE_JUNK_WORDS[Math.floor(Math.random() * FAKE_JUNK_WORDS.length)];

      // Alternate the raw shape on purpose, to prove the fallback-chain
      // extraction keeps working even if the "library shape" changes.
      const shapeVariant = Math.floor(Math.random() * 3);
      let fakeRaw;
      if (shapeVariant === 0) {
        fakeRaw = { uniqueId: username, comment: text };
      } else if (shapeVariant === 1) {
        fakeRaw = { user: { uniqueId: username, nickname: username }, message: text };
      } else {
        fakeRaw = { nickname: username, content: text };
      }
      handleIncomingRawEvent(fakeRaw);
    }),
    1400
  );
}

function stopTestMode() {
  if (testModeTimer) {
    clearInterval(testModeTimer);
    testModeTimer = null;
  }
  diagnostics.connectionStatus = "idle";
  broadcastState();
}

// ============================================================
// WEBSOCKET SERVER - talking to the host's browser
// ============================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function buildStatePayload() {
  return {
    game: {
      status: game.status,
      difficulty: game.difficulty,
      roundNumber: game.roundNumber,
      maskedWord: getMaskedWord(),
      wordLength: game.currentWord ? game.currentWord.word.length : 0,
      category: game.currentWord ? game.currentWord.category : null,
      hintText: game.hintsRevealed >= 1 && game.currentWord ? game.currentWord.hint : null,
      hintsRevealed: game.hintsRevealed,
      secondsElapsed: game.roundStartedAt ? Math.floor((Date.now() - game.roundStartedAt) / 1000) : 0,
      roundSeconds: ROUND_SECONDS,
      lastRoundResult: game.lastRoundResult
    },
    leaderboard: getLeaderboard(),
    recentComments: game.recentComments.slice(0, 12),
    diagnostics
  };
}

let broadcastPending = false;
function broadcastState(lightweight = false) {
  if (broadcastPending) return;
  broadcastPending = true;
  setTimeout(() => {
    broadcastPending = false;
    const payload = JSON.stringify({ type: "state", payload: buildStatePayload() });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        try {
          client.send(payload);
        } catch (err) {
          console.error("[SAFETY-NET] Error sending to a client:", err);
        }
      }
    });
  }, lightweight ? 0 : 120);
}

wss.on(
  "connection",
  safely("ws-connection", (ws) => {
    ws.send(JSON.stringify({ type: "state", payload: buildStatePayload() }));

    ws.on(
      "message",
      safely("ws-message", (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return; // ignore malformed messages instead of crashing
        }
        handleClientAction(msg);
      })
    );
  })
);

function handleClientAction(msg) {
  const { type, payload } = msg || {};
  switch (type) {
    case "connect_tiktok":
      stopTestModeIfNeeded();
      connectToTikTok(String(payload?.username || "").trim().replace(/^@/, ""));
      break;
    case "disconnect_tiktok":
      stopEverything();
      diagnostics.connectionStatus = "idle";
      diagnostics.tiktokUsername = null;
      broadcastState();
      break;
    case "set_test_mode":
      if (payload?.enabled) {
        startTestMode();
      } else {
        stopTestMode();
      }
      break;
    case "start_game":
      game.difficulty = payload?.difficulty || game.difficulty;
      game.scores.clear();
      game.usedWords.clear();
      game.roundNumber = 0;
      startRound();
      break;
    case "skip_word":
      if (game.status === "live") timeoutRound();
      break;
    case "end_game":
      endGame();
      break;
    default:
      break;
  }
}

function stopTestModeIfNeeded() {
  if (testModeTimer) stopTestMode();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WORD500 server listening on port ${PORT}`);
  console.log(
    diagnostics.signKeyConfigured
      ? "EulerStream signing key detected - TikTok connections are ready."
      : "No EULERSTREAM_API_KEY found - Test Mode will work, but live TikTok connections will not."
  );
});
