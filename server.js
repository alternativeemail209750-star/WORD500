// server.js
// WORD500 - a live Wordle-style word game driven by TikTok LIVE chat.
//
// How a round works, in plain terms:
//   - The server picks a secret word and shows blank tiles for it.
//   - Every few seconds is a "voting window": any TikTok chat comment
//     that's a real word of the right length counts as a vote for that
//     word. When the window ends, the MOST-VOTED word becomes the
//     audience's official guess for that turn.
//   - That guess gets scored like classic Wordle (green/yellow/red),
//     the tiles and keyboard update, and one attempt is used up.
//   - Repeat until the audience guesses the word or runs out of
//     attempts.
//
// Sections in this file:
//   1. Safety net (crash protection)                -> SAFETY NET
//   2. Turning any raw chat event into {user,text}   -> FIELD EXTRACTION
//   3. Wordle scoring + keyboard state               -> SCORING
//   4. The game itself (voting windows, streaks)     -> GAME STATE
//   5. Talking to TikTok (connect + retry + test)    -> TIKTOK CONNECTION
//   6. Talking to the browser (WebSocket)            -> WEBSOCKET SERVER

import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { TikTokLiveConnection, WebcastEvent, SignConfig } from "tiktok-live-connector";
import { ANSWER_WORDS } from "./answers.js";
import { dictionaryState, loadDictionary, isValidGuessWord, getWordsOfLength } from "./dictionary.js";

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
  "uniqueId", "uniqueid", "user.uniqueId", "user.uniqueid", "user.username",
  "username", "nickname", "user.nickname", "author.uniqueId", "author.nickname", "data.uniqueId"
];
const MESSAGE_PATHS = ["comment", "message", "content", "text", "msg", "data.comment", "data.message"];

function extractChatFields(raw) {
  const username = String(extractField(raw, USERNAME_PATHS, "viewer"));
  const text = String(extractField(raw, MESSAGE_PATHS, ""));
  return { username, text };
}

function normalizeGuess(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z]/g, "")
    .trim();
}

// ============================================================
// SCORING - classic Wordle-style feedback (handles repeated letters)
// ============================================================
function scoreGuess(guess, answer) {
  const n = answer.length;
  const result = new Array(n).fill("absent");
  const guessLetters = guess.split("");
  const answerLetters = answer.split("");
  const remaining = {};
  for (const letter of answerLetters) remaining[letter] = (remaining[letter] || 0) + 1;

  for (let i = 0; i < n; i++) {
    if (guessLetters[i] === answerLetters[i]) {
      result[i] = "correct";
      remaining[guessLetters[i]] -= 1;
    }
  }
  for (let i = 0; i < n; i++) {
    if (result[i] === "correct") continue;
    const letter = guessLetters[i];
    if (remaining[letter] > 0) {
      result[i] = "present";
      remaining[letter] -= 1;
    }
  }
  return result;
}

const STATUS_RANK = { unknown: 0, absent: 1, present: 2, correct: 3 };
function updateKeyboardState(keyboardState, letters, feedback) {
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    const incoming = feedback[i];
    const current = keyboardState[letter] || "unknown";
    if (STATUS_RANK[incoming] > STATUS_RANK[current]) keyboardState[letter] = incoming;
  }
}

// ============================================================
// GAME STATE
// ============================================================
const MAX_ATTEMPTS = 15;
const VOTE_WINDOW_SECONDS = 6;

const game = {
  status: "idle", // idle | live | won | lost
  wordLength: 5,
  secretWord: null,
  guesses: [], // { word, feedback, caller }
  attemptsLeft: MAX_ATTEMPTS,
  maxAttempts: MAX_ATTEMPTS,
  streak: 0,
  keyboardState: {}, // letter -> "correct" | "present" | "absent"
  voteTally: new Map(), // normalizedWord -> { count, firstUser, firstAt }
  windowEndsAt: null,
  recentComments: [],
  usedWords: new Set(),
  scores: new Map() // username -> points
};

function pickAnswer(wordLength) {
  const pool = ANSWER_WORDS[wordLength] || ANSWER_WORDS[5];
  const unused = pool.filter((w) => !game.usedWords.has(w));
  const list = unused.length > 0 ? unused : pool;
  if (unused.length === 0) game.usedWords.clear();
  const pick = list[Math.floor(Math.random() * list.length)];
  game.usedWords.add(pick);
  return pick;
}

function processGuess(word, caller) {
  const feedback = scoreGuess(word, game.secretWord);
  game.guesses.push({ word, feedback, caller });
  updateKeyboardState(game.keyboardState, word.split(""), feedback);
  game.attemptsLeft -= 1;

  const isRealPlayer = caller && caller !== "(auto)";
  const prior = game.scores.get(caller) || 0;

  if (word === game.secretWord) {
    if (isRealPlayer) game.scores.set(caller, prior + 100);
    game.status = "won";
    game.streak += 1;
  } else {
    if (isRealPlayer) game.scores.set(caller, prior + 10);
    if (game.attemptsLeft <= 0) {
      game.status = "lost";
      game.streak = 0;
    }
  }
}

function startGame(wordLength, quickStartCount = 0) {
  const length = [4, 5, 6].includes(wordLength) ? wordLength : 5;
  game.wordLength = length;
  game.secretWord = pickAnswer(length);
  game.guesses = [];
  game.attemptsLeft = MAX_ATTEMPTS;
  game.maxAttempts = MAX_ATTEMPTS;
  game.keyboardState = {};
  game.voteTally.clear();
  game.status = "live";

  if (quickStartCount > 0) {
    const candidates = getWordsOfLength(length).filter((w) => w !== game.secretWord);
    for (let i = 0; i < quickStartCount && candidates.length > 0 && game.status === "live"; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const word = candidates.splice(idx, 1)[0];
      processGuess(word, "(auto)");
    }
  }

  if (game.status === "live") {
    game.windowEndsAt = Date.now() + VOTE_WINDOW_SECONDS * 1000;
  }
  broadcastState();
}

function giveUp() {
  if (game.status !== "live") return;
  game.status = "lost";
  game.streak = 0;
  game.windowEndsAt = null;
  broadcastState();
}

function endGame() {
  game.status = "idle";
  game.secretWord = null;
  game.guesses = [];
  game.voteTally.clear();
  game.windowEndsAt = null;
  broadcastState();
}

function addVote(username, normalizedWord) {
  if (game.status !== "live") return;
  if (normalizedWord.length !== game.wordLength) return;
  if (!isValidGuessWord(normalizedWord)) return;
  const entry = game.voteTally.get(normalizedWord);
  if (entry) {
    entry.count += 1;
  } else {
    game.voteTally.set(normalizedWord, { count: 1, firstUser: username, firstAt: Date.now() });
  }
}

function resolveVoteWindow() {
  if (game.voteTally.size === 0) {
    game.windowEndsAt = Date.now() + VOTE_WINDOW_SECONDS * 1000;
    broadcastState();
    return;
  }
  let winner = null;
  for (const [word, data] of game.voteTally.entries()) {
    if (
      !winner ||
      data.count > winner.data.count ||
      (data.count === winner.data.count && data.firstAt < winner.data.firstAt)
    ) {
      winner = { word, data };
    }
  }
  game.voteTally.clear();
  processGuess(winner.word, winner.data.firstUser);
  if (game.status === "live") {
    game.windowEndsAt = Date.now() + VOTE_WINDOW_SECONDS * 1000;
  } else {
    game.windowEndsAt = null;
  }
  broadcastState();
}

function getLeaderboard() {
  return [...game.scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([username, score]) => ({ username, score }));
}

function getTopVotes() {
  return [...game.voteTally.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([word, data]) => ({ word, count: data.count }));
}

setInterval(
  safely("game-tick", () => {
    if (game.status !== "live" || !game.windowEndsAt) return;
    if (Date.now() >= game.windowEndsAt) {
      resolveVoteWindow();
    } else {
      broadcastState(true);
    }
  }),
  1000
);

// ============================================================
// DIAGNOSTICS
// ============================================================
const diagnostics = {
  rawEventCount: 0,
  lastReceivedUser: null,
  lastReceivedText: null,
  lastReceivedAt: null,
  connectionStatus: "idle",
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

  addVote(username, normalizeGuess(text));
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

      connection.on(WebcastEvent.CHAT, safely("chat-event", (data) => handleIncomingRawEvent(data)));
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

// ---- Test Mode: fake events, shaped a few different ways on purpose ----
const FAKE_USERNAMES = [
  "comet_fan", "wordwiz99", "livstream_lu", "night.owl", "byte_buddy", "quiz.queen", "pixel_pete"
];
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
      const roll = Math.random();
      let text;

      if (game.status === "live" && game.secretWord && roll < 0.06) {
        text = game.secretWord;
      } else if (game.status === "live" && roll < 0.4) {
        const pool = getWordsOfLength(game.wordLength);
        text = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : FAKE_JUNK_WORDS[0];
      } else {
        text = FAKE_JUNK_WORDS[Math.floor(Math.random() * FAKE_JUNK_WORDS.length)];
      }

      const shapeVariant = Math.floor(Math.random() * 3);
      let fakeRaw;
      if (shapeVariant === 0) fakeRaw = { uniqueId: username, comment: text };
      else if (shapeVariant === 1) fakeRaw = { user: { uniqueId: username, nickname: username }, message: text };
      else fakeRaw = { nickname: username, content: text };

      handleIncomingRawEvent(fakeRaw);
    }),
    1000
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
// WEBSOCKET SERVER
// ============================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function buildStatePayload() {
  const now = Date.now();
  return {
    game: {
      status: game.status,
      wordLength: game.wordLength,
      secretWord: game.status === "lost" ? game.secretWord : null,
      guesses: game.guesses,
      attemptsLeft: game.attemptsLeft,
      maxAttempts: game.maxAttempts,
      streak: game.streak,
      keyboardState: game.keyboardState,
      secondsLeftInWindow:
        game.status === "live" && game.windowEndsAt ? Math.max(0, Math.ceil((game.windowEndsAt - now) / 1000)) : 0,
      voteWindowSeconds: VOTE_WINDOW_SECONDS,
      topVotes: getTopVotes()
    },
    leaderboard: getLeaderboard(),
    recentComments: game.recentComments.slice(0, 12),
    diagnostics: {
      ...diagnostics,
      dictionarySource: dictionaryState.source,
      dictionaryWordCount: dictionaryState.wordCount,
      dictionaryLoading: dictionaryState.loading
    }
  };
}

let broadcastPending = false;
function broadcastState(lightweight = false) {
  if (broadcastPending) return;
  broadcastPending = true;
  setTimeout(
    () => {
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
    },
    lightweight ? 0 : 120
  );
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
          return;
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
      if (payload?.enabled) startTestMode();
      else stopTestMode();
      break;
    case "start_game":
      startGame(Number(payload?.wordLength) || 5, Number(payload?.quickStartCount) || 0);
      break;
    case "give_up":
      giveUp();
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
  loadDictionary();
});
