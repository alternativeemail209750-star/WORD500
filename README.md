# WORD500 — unlimited-guess deduction, live on TikTok

This is a complete, ready-to-run web app. You don't need to write or
edit any code. This document explains the rules and walks you through
putting it online.

---

## 1. The rules

- Guess the hidden word. Its length is your choice (4-20 letters) in
  Settings. **Guessing is unlimited** — anyone can guess, any number
  of times, at any moment.
- Every guess only reveals **counts**, never which letters:
  - 🟩 Green — right letter, right spot
  - 🟨 Yellow — right letter, wrong spot
  - 🟥 Red — not in the word
- **A guess only counts if it still fits every clue so far.** If it
  contradicts an earlier guess's counts, it's rejected with a brief
  on-screen note explaining which earlier guess it conflicts with —
  this is what keeps unlimited guessing meaningful instead of just
  spamming random words.
- The keyboard — now its own section at the top of the board, sized to
  match the guessed-word tiles — and every letter tile in every
  guessed word, is a **host-only, click-to-mark scratchpad**. Click to
  cycle a letter red → yellow → green → none. The game never colors
  anything for you; letters that have appeared in any guess get a
  subtly darker shade so you can see what's been tried, independent of
  your own marks.
- 💡 **Hints are unlimited** and suggest a word consistent with every
  clue so far — never the literal answer.
- **Difficulty** — Normal / Medium / Hard / **Random** — controls which
  secret words are eligible. Random skips the difficulty engine
  entirely and draws from every word of that length, easy to
  extremely hard.
- **When a round is won:** confetti plays and a floating celebration
  window walks through three stages automatically — the winner's name
  and the answer (in large text), then the top scorers for this round,
  then the all-time top scorers — each shown for a few seconds
  (configurable in Settings) before closing on its own. Tap ✕ to skip
  it early.

**Three modes**, each with a slightly different bottom control bar:

- **Live** — connects to your real TikTok LIVE chat; every matching
  comment is evaluated as a guess in real time. Scores count toward
  the leaderboard. You can also type in the secret word yourself at
  any time from the bottom bar.
- **Test** — the same mechanics with simulated fake chat, and scores
  are **not** saved. Also has its own "set the secret word" box.
- **Offline** — just you. A guess box at the bottom lets you type
  directly — no chat, no leaderboard, solo practice.

---

## 2. The board layout

- **Keyboard first, its own section**, right at the top of the round
  card — clearly visible above the guessed words, not buried below a
  chat feed.
- **Guesses always fit on one line**: word tiles on the left, then the
  green/yellow/red counts as three badges in a row (not stacked), no
  matter how long the word is — tile size (and the keyboard's key
  size, to match) is computed from the real screen width every time.
- Tiles are noticeably larger now — short and medium words render at
  roughly the biggest size that still leaves room for the horizontal
  counts row and guarantees no wrapping (on a typical modern phone
  that's close to double the old size; on very narrow/old phones it's
  somewhat less, since there's only so much width to go around once
  the counts row also needs space). Long words (16+ letters) still
  shrink further automatically to guarantee they never wrap.
- **Every guess made this round stays visible without scrolling** —
  rows shrink further automatically once there are enough guesses that
  they wouldn't otherwise all fit on screen.
- ⛶ in the top-right toggles **fullscreen** on/off (works on desktop
  and Android browsers; iOS Safari doesn't support fullscreening a web
  page, so the button will simply do nothing there).
- The old "Live activity" chat-comment feed has been removed entirely
  to keep the board focused and uncluttered by chat noise.

---

## 3. The difficulty engine (Normal / Medium / Hard / Random)

Since guessing is unlimited and fully automated, difficulty can't come
from restricting attempts — it comes from **which secret word gets
picked**. `difficulty.js` scores every candidate word (0-100, higher =
harder) across four factors, then buckets it:

| Factor | What it measures |
|---|---|
| **Vocabulary** | How common the word is likely to be (word length + rare letters like J/Q/X/Z, with a discount for a small hand-picked "very familiar" word list) |
| **Structure** | Repeated letters, consonant clusters, vowel scarcity — things that make aggregate green/yellow/red counts harder to reason about |
| **Ambiguity** | How many other same-length words look similar (share most of their letters) — more look-alikes means more genuine deduction work |
| **Information** | A proxy for how much a single count actually narrows things down (repeated letters blur a count's meaning) |

The four scores combine with configurable weights
(`DIFFICULTY_WEIGHTS`) into one score, then bucket by configurable
thresholds (`DIFFICULTY_THRESHOLDS`, default: 0-35 Normal, 36-65
Medium, 66-100 Hard). **Random** bypasses this scoring entirely and
draws from the full word pool for that length. All of this lives at
the top of `difficulty.js` and is safe to tune without touching any
scoring logic.

**Honest limitation:** vocabulary familiarity is a heuristic proxy
(word length + letter rarity + a hand-picked common-word list), not a
real frequency corpus. Very short (4-letter) and very long (18-20
letter) word pools are small and structurally uniform, so they may
cluster into one tier — the game gracefully falls back to the full
pool for that length if a tier has nothing to offer.

---

## 4. One-time setup: get a signing key (do this first)

TikTok doesn't publish an official way for outside apps to read LIVE
chat, so this app uses a well-known, widely-used service called
**EulerStream** to do that reliably. Set this up before anything else —
without a key, Live mode won't be able to connect.

1. Go to **https://www.eulerstream.com** and create a free account.
2. Once logged in, find your **API key** on your dashboard.
3. Copy it somewhere safe — you'll paste it into Render in step 6.

You can skip this for now if you only want **Test** or **Offline** mode
to start with, but you'll need it before using Live mode.

---

## 5. Step 1 — Put the code on GitHub

1. Download all the files into one folder on your computer. Keep the
   `public` folder as a folder — don't rename or flatten it.
2. Go to **https://github.com** and log in.
3. Click the **+** icon in the top-right corner → **New repository**.
4. Name it something like `word500-game`. Public or Private both work.
   Don't check any "initialize with" boxes. Click **Create repository**.
5. On the next page, click **"uploading an existing file"**.
6. Open the folder on your computer, select **all the files and folders
   inside it** (including the `public` folder), and **drag them all**
   onto the GitHub upload box at once.
7. Scroll down and click the green **Commit changes** button.

Double-check your repo looks like this afterward:

```
server.js
answers.js
dictionary.js
difficulty.js
package.json
render.yaml
README.md
.gitignore
.env.example
public/
  index.html
  style.css
  game.js
```

If `public/` isn't its own folder in the file list (its 3 files sitting
loose at the top level instead), delete those loose files and re-drag
the `public` folder by itself — this is the #1 cause of a "Cannot GET
/" error later.

---

## 6. Step 2 — Create the Render web service

1. Go to **https://render.com** and log in.
2. Click **New +** → **Web Service**.
3. Choose **"Build and deploy from a Git repository"** and connect your
   GitHub account if asked.
4. Select the `word500-game` repository.
5. Fill in the settings:
   - **Name:** anything, e.g. `word500-game`
   - **Region:** whichever is closest to you
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free is fine to start
6. Before clicking create, scroll to **Environment Variables** and add:
   - **Key:** `EULERSTREAM_API_KEY`
   - **Value:** paste the key from EulerStream
   (No key yet? Skip this — add it later from the **Environment** tab,
   then click **Manual Deploy** to restart with it.)
7. Click **Create Web Service**.

Render builds and starts the app (a couple of minutes the first time).
When it's done, you'll get a live URL like
`https://word500-game.onrender.com` — that's your game.

**Free plan note:** Render's free tier sleeps after inactivity and takes
30–60 seconds to wake up on the next visit. Open your game's URL a few
minutes before going live so it's already awake.

---

## 7. Step 3 — Try Test Mode, then Offline Mode

1. Open your Render URL.
2. Tap ⚙️ **Settings** → tap the **Mode** row → choose **Test** → pick a
   word length and difficulty → **Apply settings & start new round**.
3. In the bottom bar, try the **"Set the secret word…"** box to force a
   specific word, then watch fake viewers guess it — solve it and
   watch the confetti + winner callout + auto leaderboard pop-up.
4. Click a few letters on the keyboard (or on a guessed word's tiles)
   to see the manual red → yellow → green → none cycle, then tap
   **Reset colors**.
5. Try the ⛶ button to toggle fullscreen.
6. Now try **Offline**: Settings → Mode → Offline → Apply. A guess box
   appears at the bottom — type a real word and press Enter.

**Run through Test Mode after any future change** — the fastest way to
confirm the game still works before relying on it live.

---

## 8. Step 4 — Go live with your real TikTok

1. Start your TikTok LIVE broadcast as normal.
2. Open ⚙️ **Settings**, set Mode to **Live**, pick a word length and
   difficulty, tap **Apply settings & start new round**.
3. In the same panel (or the bottom bar), type your TikTok **username**
   (no @) and tap **Connect**.
4. Watch the status chips at the top of Settings — they'll show
   **Connecting…**, then either **LIVE** or a plain-language
   explanation of what went wrong.
5. Tell your audience the rules (or tap ❓): type a real word of the
   shown length into chat, any time, as many times as they like — it
   only counts if it still fits every clue so far.
6. Tap 💡 any time for a solver hint, **Give up** to end a word early,
   or **Play again** once a round finishes.

---

## 9. Viewing this on your phone while broadcasting

Since your phone is likely busy running the TikTok LIVE broadcast
itself, most hosts use a **second device** (tablet, laptop, or a second
phone) open to the same Render URL to watch the game and tap the
controls. That second screen can also be pointed at a monitor, or put
into fullscreen with the ⛶ button, so your audience can see the board
clearly.

The page is still built to behave well on a single phone: the header
stays pinned to the top, and the host controls stay pinned to the
bottom, so you can always reach them no matter how far you've scrolled.

---

## 10. Reading the Diagnostics panel

Diagnostics live inside the ⚙️ Settings panel (scroll down).

| Line | What it tells you |
|---|---|
| **Raw events received** | Total chat messages received since the app started. Stuck at 0 while people are chatting? The connection isn't receiving anything. |
| **Last received** | The most recent username and message seen. |
| **Connection status** | Idle / Connecting / LIVE / Simulating (Test Mode) / Connection issue / Disconnected. |
| **Signing key set up?** | Whether `EULERSTREAM_API_KEY` is configured on Render. Must say "Yes" before Live mode can connect. |
| **Word dictionary** | Should read "370,xxx words (full list)". If it says "fallback list," the one-time download from GitHub failed on startup (rare) — the game still works with a smaller recognized word list until the next restart. |
| **Retry attempts** | How many times the app auto-retried a failed TikTok connection (up to 3, automatically). |
| **Last message** | A plain-language note about the most recent problem, if any. |

---

## 11. Troubleshooting common messages

| Message you might see | What it means | What to do |
|---|---|---|
| "No signing key set up yet…" | `EULERSTREAM_API_KEY` isn't set on Render | Add it under Render → Environment, then redeploy |
| "Switch to Live mode first, then connect." | You tried to connect while Mode was Test or Offline | Set Mode to Live and tap Apply first |
| "That TikTok username couldn't be found" | Typo, or the account doesn't exist | Re-check spelling, no @ symbol |
| "That account doesn't look like it's LIVE right now" | You connected before starting the broadcast, or it ended | Start your TikTok LIVE first, then connect |
| "The signing key was rejected" | The key was mistyped or expired | Copy it again from EulerStream and update it on Render |
| "Must be exactly N letters…" | Your custom secret word didn't match the selected word length | Retype it to match, or change the word length first |
| A red toast flashing "Conflicts with guess #…" | Someone's guess contradicted an earlier clue — working as intended | Nothing to fix — this is the core game mechanic |
| Tapping ⛶ does nothing | Your browser doesn't support the Fullscreen API for web pages | Known on iOS Safari; try Chrome/Android or a desktop browser instead |
| TikTok disconnects every time you apply Settings | This was a bug (older versions of this app force-disconnected on every settings change) | Fixed — changing word length, difficulty, etc. in Live mode no longer touches an already-connected TikTok session |
| "Cannot GET /" in the browser | The `public` folder didn't upload correctly to GitHub | See the folder-structure note in step 5 |

---

## 12. Making changes later (optional)

- **Add or remove possible secret words:** open `answers.js` on GitHub,
  add or edit an entry under the right letter-length key (4 through
  20), and commit. Avoid adding a word that's just another word on the
  list with an "s" added.
- **Retune difficulty:** open `difficulty.js` and adjust
  `DIFFICULTY_WEIGHTS` or `DIFFICULTY_THRESHOLDS` at the top.
- **Change colors:** open `public/style.css` — all colors are defined
  once at the top under `:root`.
- **Change the default round-to-round delay or win-celebration
  length:** open `server.js` and adjust `DEFAULT_AUTO_CONTINUE_DELAY`
  or `DEFAULT_LEADERBOARD_SHOW_SECONDS` near the top of the file (both
  are also adjustable per-session from Settings, without editing code).
- Any edit committed on GitHub triggers an automatic redeploy on Render
  within a minute or two.

---

## What's inside this project (for reference)

- `server.js` — the game engine: the consistency-checked unlimited
  guessing pipeline, TikTok connection, modes, hints, win tracking for
  the celebration, and both leaderboards.
- `difficulty.js` — the standalone 4-factor difficulty scoring engine.
- `answers.js` — the curated list of possible secret words, one array
  per length from 4 to 20 letters.
- `dictionary.js` — downloads the 370,000+ word list used to check
  whether a chat comment (or offline/host guess) is a real, guessable
  word, with a small built-in fallback if the download ever fails.
- `public/index.html`, `public/style.css`, `public/game.js` — the
  screen you and your audience look at, including the manual
  scratchpad keyboard, per-tile coloring, confetti, and fullscreen
  toggle (all entirely client-side except the win data itself).
- `.env.example` — a reference list of the one setting the app uses.
- `render.yaml` — an optional shortcut for Render's "Blueprint" deploy
  option, instead of the manual steps above.
