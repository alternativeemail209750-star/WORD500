// server.js
// WORD500 - faithful to the real word500.com rules:
//   - 8 attempts total
//   - Each guess only reveals COUNTS: how many letters are green
//     (right letter, right spot), yellow (right letter, wrong spot),
//     and red (not in the word) - never which letters those are.
//   - Three difficulty tiers control the secret word:
//       Standard    - no repeated letters, and no J/Q/X/Z
//       Standard+   - no repeated letters, J/Q/X/Z allowed
//       Advanced    - anything goes, including repeated letters
//   - A Hint suggests a word that's consistent with every clue so far
//     (a solver assist) - it never just reveals a letter's position.
//   - The on-screen keyboard is a MANUAL scratchpad: the player clicks
//     letters to cycle red -> yellow -> green -> none themselves, to
//     track their own deductions. The server has no say in that at all
//     - it lives entirely in the browser (see public/game.js).
//
// On top of that authentic core, this build adds three modes for a
// TikTok LIVE context (not part of the original game):
//   - Live    : real TikTok LIVE chat votes on each guess, scores count
//   - Test    : simulated fake chat, same mechanics, scores NOT saved,
//               plus a field to set your own secret word for testing
//   - Offline : host types guesses directly, no chat/leaderboard involved

import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { TikTokLiveConnection, WebcastEvent, SignConfig } from "tiktok-live-connector";
import { ANSWER_WORDS, MIN_WORD_LENGTH, MAX_WORD_LENGTH } from "./answers.js";
import { dictionaryState, loadDictionary, isValidGuessWord } from "./dictionary.js";

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

// Aggregate counts only - never which letters. That's the whole game.
function scoreCounts(guess, answer) {
  const n = answer.length;
  const guessLetters = guess.split("");
  const answerLetters = answer.split("");
  const remaining = {};
  for (const letter of answerLetters) remaining[letter] = (remaining[letter] || 0) + 1;

  let green = 0;
  const matchedGuessIndex = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (guessLetters[i] === answerLetters[i]) {
      green++;
      matchedGuessIndex[i] = true;
      remaining[guessLetters[i]] -= 1;
    }
  }
  let yellow = 0;
  for (let i = 0; i < n; i++) {
    if (matchedGuessIndex[i]) continue;
    const letter = guessLetters[i];
    if (remaining[letter] > 0) {
      yellow++;
      remaining[letter] -= 1;
    }
  }
  const red = n - green - yellow;
  return { green, yellow, red };
}

function countsEqual(a, b) {
  return a.green === b.green && a.yellow === b.yellow && a.red === b.red;
}

function passesDifficulty(word, difficulty) {
  const hasRepeat = new Set(word).size !== word.length;
  const hasExcludedLetter = /[jqxz]/.test(word);
  if (difficulty === "standard") return !hasRepeat && !hasExcludedLetter;
  if (difficulty === "standardPlus") return !hasRepeat;
  return true;
}

const MAX_ATTEMPTS = 8;
const VOTE_WINDOW_SECONDS = 8;
const MAX_HINTS_PER_ROUND = 3;
const DEFAULT_AUTO_CONTINUE_DELAY = 12;

const game = {
  mode: "test",
  status: "idle",
  wordLength: 5,
  difficulty: "standard",
  secretWord: null,
  guesses: [],
  attemptsLeft: MAX_ATTEMPTS,
  maxAttempts: MAX_ATTEMPTS,
  streak: 0,
  hintsUsed: 0,
  maxHints: MAX_HINTS_PER_ROUND,
  hintSuggestions: [],
  voteTally: new Map(),
  windowEndsAt: null,
  recentComments: [],
  usedWords: new Set(),
  roundScores: new Map(),
  totalScores: new Map(),
  autoContinue: false,
  autoContinueDelaySeconds: DEFAULT_AUTO_CONTINUE_DELAY,
  autoContinueAt: null
};

function clampWordLength(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.min(MAX_WORD_LENGTH, Math.max(MIN_WORD_LENGTH, Math.round(v)));
}

function pickAnswer(wordLength, difficulty) {
  const pool = ANSWER_WORDS[wordLength] || ANSWER_WORDS[5];
  let candidates = pool.filter((w) => passesDifficulty(w, difficulty));
  if (candidates.length === 0) candidates = pool;

  const unused = candidates.filter((w) => !game.usedWords.has(w));
  const list = unused.length > 0 ? unused : candidates;
  if (unused.length === 0) game.usedWords.clear();
  const pick = list[Math.floor(Math.random() * list.length)];
  game.usedWords.add(pick);
  return pick;
}

function awardPoints(caller, points) {
  if (game.mode !== "live" || !caller) return;
  game.roundScores.set(caller, (game.roundScores.get(caller) || 0) + points);
  game.totalScores.set(caller, (game.totalScores.get(caller) || 0) + points);
}

function processGuess(word, caller) {
  const counts = scoreCounts(word, game.secretWord);
  game.guesses.push({ word, counts, caller });
  game.attemptsLeft -= 1;

  if (word === game.secretWord) {
    awardPoints(caller, 100);
    game.status = "won";
    game.streak += 1;
  } else {
    awardPoints(caller, 10);
    if (game.attemptsLeft <= 0) {
      game.status = "lost";
      game.streak = 0;
    }
  }

  if (game.status !== "live") {
    game.windowEndsAt = null;
    if (game.autoContinue) {
      game.autoContinueAt = Date.now() + game.autoContinueDelaySeconds * 1000;
    }
  }
}

function startRound(overrideWord) {
  game.secretWord = overrideWord || pickAnswer(game.wordLength, game.difficulty);
  game.guesses = [];
  game.attemptsLeft = MAX_ATTEMPTS;
  game.maxAttempts = MAX_ATTEMPTS;
  game.voteTally.clear();
  game.hintsUsed = 0;
  game.hintSuggestions = [];
  game.roundScores.clear();
  game.status = "live";
  game.autoContinueAt = null;

  if (game.mode !== "offline") {
    game.windowEndsAt = Date.now() + VOTE_WINDOW_SECONDS * 1000;
  } else {
    game.windowEndsAt = null;
  }
  broadcastState();
}

function validateTestAnswer(raw, wordLength) {
  const word = normalizeGuess(raw);
  if (!word) return null;
  if (word.length !== wordLength) return null;
  return word;
}

function applySettings(settings) {
  const mode = settings.mode;
  const wordLength = settings.wordLength;
  const difficulty = settings.difficulty;
  const autoContinue = settings.autoContinue;
  const autoContinueDelaySeconds = settings.autoContinueDelaySeconds;

  if (["live", "test", "offline"].includes(mode)) {
    if (mode !== "live" && game.mode === "live") stopEverything();
    game.mode = mode;
    if (mode !== "live") {
      diagnostics.connectionStatus = mode === "test" ? "test_mode" : "idle";
      diagnostics.lastErrorMessage = null;
    }
  }
  if (wordLength !== undefined) game.wordLength = clampWordLength(wordLength);
  if (["standard", "standardPlus", "advanced"].includes(difficulty)) game.difficulty = difficulty;
  if (typeof autoContinue === "boolean") game.autoContinue = autoContinue;
  if (autoContinueDelaySeconds !== undefined) {
    const v = Number(autoContinueDelaySeconds);
    game.autoContinueDelaySeconds = Number.isFinite(v) ? Math.min(120, Math.max(3, Math.round(v))) : DEFAULT_AUTO_CONTINUE_DELAY;
  }

  let overrideWord;
  if (game.mode === "test" && settings.testAnswer) {
    const validated = validateTestAnswer(settings.testAnswer, game.wordLength);
    if (validated) {
      overrideWord = validated;
    } else {
      diagnostics.lastErrorMessage = `Test word ignored - it must be exactly ${game.wordLength} letters, A-Z only.`;
    }
  }

  startRound(overrideWord);
}

function playAgain() {
  startRound();
}

function giveUp() {
  if (game.status !== "live") return;
  game.status = "lost";
  game.streak = 0;
  game.windowEndsAt = null;
  if (game.autoContinue) game.autoContinueAt = Date.now() + game.autoContinueDelaySeconds * 1000;
  broadcastState();
}

function endGame() {
  game.status = "idle";
  game.secretWord = null;
  game.guesses = [];
  game.voteTally.clear();
  game.windowEndsAt = null;
  game.autoContinueAt = null;
  broadcastState();
}

function useHint() {
  if (game.status !== "live") return;
  if (game.hintsUsed >= game.maxHints) return;

  const pool = ANSWER_WORDS[game.wordLength] || [];
  let candidates = pool.filter((w) => passesDifficulty(w, game.difficulty));
  for (const g of game.guesses) {
    candidates = candidates.filter((w) => countsEqual(scoreCounts(g.word, w), g.counts));
  }
  candidates = candidates.filter((w) => !game.hintSuggestions.includes(w));

  if (candidates.length === 0) return;
  const suggestion = candidates[Math.floor(Math.random() * candidates.length)];
  game.hintSuggestions.push(suggestion);
  game.hintsUsed += 1;
  broadcastState();
}

function addVote(username, normalizedWord) {
  if (game.status !== "live" || game.mode === "offline") return;
  if (normalizedWord.length !== game.wordLength) return;
  if (normalizedWord !== game.secretWord && !isValidGuessWord(normalizedWord)) return;
  const entry = game.voteTally.get(normalizedWord);
  if (entry) entry.count += 1;
  else game.voteTally.set(normalizedWord, { count: 1, firstUser: username, firstAt: Date.now() });
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
  }
  broadcastState();
}

function submitOfflineGuess(rawWord) {
  if (game.mode !== "offline" || game.status !== "live") {
    return { ok: false, error: "No round in progress." };
  }
  const word = normalizeGuess(rawWord);
  if (word.length !== game.wordLength) {
    return { ok: false, error: `Guess must be ${game.wordLength} letters.` };
  }
  if (word !== game.secretWord && !isValidGuessWord(word)) {
    return { ok: false, error: "That's not in the word list." };
  }
  processGuess(word, "Host");
  broadcastState();
  return { ok: true };
}

function getLeaderboard(map) {
  return [...map.entries()]
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
    if (game.status === "live" && game.windowEndsAt) {
      if (Date.now() >= game.windowEndsAt) resolveVoteWindow();
      else broadcastState(true);
    } else if (game.autoContinueAt) {
      if (Date.now() >= game.autoContinueAt) {
        game.autoContinueAt = null;
        playAgain();
      } else {
        broadcastState(true);
      }
    }
  }),
  1000
);

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
  if (game.mode !== "live") {
    diagnostics.lastErrorMessage = "Switch to Live mode first, then connect.";
    broadcastState();
    return;
  }
  if (!diagnostics.signKeyConfigured) {
    diagnostics.connectionStatus = "error";
    diagnostics.lastErrorMessage = "No signing key set up yet. Add EULERSTREAM_API_KEY in Render before connecting.";
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
        safely("error-event", (err) => console.error("[TikTok] connection error event:", err))
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

const FAKE_USERNAMES = [
  "comet_fan", "wordwiz99", "livstream_lu", "night.owl", "byte_buddy", "quiz.queen", "pixel_pete"
];
const FAKE_JUNK_WORDS = ["hi", "lol", "go team", "so fun", "love this game", "hmm", "wait what"];

function startTestMode() {
  stopEverything();
  diagnostics.connectionStatus = "test_mode";
  diagnostics.lastErrorMessage = null;
  diagnostics.tiktokUsername = null;

  testModeTimer = setInterval(
    safely("test-mode-tick", () => {
      if (game.mode !== "test") return;
      const username = FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)];
      const roll = Math.random();
      let text;

      if (game.status === "live" && game.secretWord && roll < 0.06) {
        text = game.secretWord;
      } else if (game.status === "live" && roll < 0.4) {
        const pool = ANSWER_WORDS[game.wordLength] || [];
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function buildStatePayload() {
  const now = Date.now();
  return {
    game: {
      mode: game.mode,
      status: game.status,
      wordLength: game.wordLength,
      difficulty: game.difficulty,
      secretWord: game.status === "lost" ? game.secretWord : null,
      guesses: game.guesses,
      attemptsLeft: game.attemptsLeft,
      maxAttempts: game.maxAttempts,
      streak: game.streak,
      hintsUsed: game.hintsUsed,
      maxHints: game.maxHints,
      hintSuggestions: game.hintSuggestions,
      secondsLeftInWindow:
        game.status === "live" && game.windowEndsAt ? Math.max(0, Math.ceil((game.windowEndsAt - now) / 1000)) : 0,
      voteWindowSeconds: VOTE_WINDOW_SECONDS,
      topVotes: getTopVotes(),
      autoContinue: game.autoContinue,
      autoContinueDelaySeconds: game.autoContinueDelaySeconds,
      autoContinueSecondsLeft: game.autoContinueAt ? Math.max(0, Math.ceil((game.autoContinueAt - now) / 1000)) : 0,
      minWordLength: MIN_WORD_LENGTH,
      maxWordLength: MAX_WORD_LENGTH
    },
    roundLeaderboard: getLeaderboard(game.roundScores),
    totalLeaderboard: getLeaderboard(game.totalScores),
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
        handleClientAction(ws, msg);
      })
    );
  })
);

function handleClientAction(ws, msg) {
  const type = msg && msg.type;
  const payload = msg && msg.payload;
  switch (type) {
    case "connect_tiktok":
      if (testModeTimer) {
        clearInterval(testModeTimer);
        testModeTimer = null;
      }
      connectToTikTok(String((payload && payload.username) || "").trim().replace(/^@/, ""));
      break;
    case "disconnect_tiktok":
      stopEverything();
      diagnostics.connectionStatus = "idle";
      diagnostics.tiktokUsername = null;
      broadcastState();
      break;
    case "apply_settings":
      applySettings(payload || {});
      if (game.mode === "test") startTestMode();
      else stopEverything();
      break;
    case "play_again":
      playAgain();
      break;
    case "give_up":
      giveUp();
      break;
    case "end_game":
      endGame();
      break;
    case "use_hint":
      useHint();
      break;
    case "submit_offline_guess": {
      const result = submitOfflineGuess(String((payload && payload.word) || ""));
      ws.send(JSON.stringify({ type: "offline_guess_result", payload: result }));
      break;
    }
    case "reset_round_leaderboard":
      game.roundScores.clear();
      broadcastState();
      break;
    case "reset_total_leaderboard":
      game.totalScores.clear();
      broadcastState();
      break;
    default:
      break;
  }
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
