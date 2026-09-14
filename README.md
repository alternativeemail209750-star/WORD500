# WORD500 — the real rules, live on TikTok

This is a complete, ready-to-run web app. You don't need to write or
edit any code. This document explains the actual WORD500 rules (verified
against word500.com and its community writeups) and walks you through
putting it online.

---

## 1. The real rules — what makes WORD500 different from Wordle

This is **not** standard Wordle. The core twist:

- You get **8 attempts** to find the secret word.
- After each guess, you're told only **how many** letters are:
  - 🟩 **Green** — right letter, right spot
  - 🟨 **Yellow** — right letter, wrong spot
  - 🟥 **Red** — not in the word
  - ...but **never which letters** those are. A guess of "TODAY" against
    the answer "LASER" shows 0 green / 1 yellow / 4 red — and that's
    all you get. You have to deduce the rest yourself.
- The on-screen keyboard is **your own scratchpad**, not an automatic
  hint system — click a letter to cycle it red → yellow → green → none
  as you reason through your guesses. "Reset colors" clears it. The
  game itself never colors it for you.
- **Difficulty** controls what the secret word can be:
  - **Standard** — no repeated letters, and excludes J/Q/X/Z
  - **Standard+** — no repeated letters, J/Q/X/Z allowed
  - **Advanced** — anything goes, including repeated letters
- **Hint** (💡, up to 3 per round) suggests a word that's consistent
  with every clue you've received so far — a solver assist, not a
  cheat. It might even be the actual answer, if you dare use it.

On top of that authentic core, this build adds three modes for running
it as a TikTok LIVE show (these are not part of the original game):

- **Live** — connects to your real TikTok LIVE chat. Every few seconds
  is a voting round: anyone in chat can type a real word of the right
  length, and whichever word gets typed most becomes the audience's
  official guess for that turn. Scores count toward the leaderboard.
- **Test** — the same voting gameplay, but with simulated fake chat
  instead of a real TikTok connection, and scores are **not** saved.
  There's also an optional field to type your **own secret word**, so
  you can test a specific scenario instead of getting a random one.
- **Offline** — just you. A text box lets you type your own guesses
  directly — no chat, no leaderboard, just solo practice.

**One customization beyond the original game:** word500.com always
uses 5-letter words. This build lets you pick **any length from 4 to
20 letters** in Settings, for variety on a longer show. Genuinely
common 18-20 letter English words are rare, so those lengths only
offer a couple of options each.

**Known simplification:** the original site lets you type `_` to skip
a letter you don't want to guess yet. That shortcut isn't implemented
here — everyone just types the full word.

---

## 2. One-time setup: get a signing key (do this first)

TikTok doesn't publish an official way for outside apps to read LIVE
chat, so this app uses a well-known, widely-used service called
**EulerStream** to do that reliably. Set this up before anything else —
without a key, Live mode won't be able to connect.

1. Go to **https://www.eulerstream.com** and create a free account.
2. Once logged in, find your **API key** on your dashboard.
3. Copy it somewhere safe — you'll paste it into Render in step 4 below.

You can skip this for now if you only want **Test** or **Offline** mode
to start with, but you'll need it before using Live mode.

---

## 3. Step 1 — Put the code on GitHub

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

## 4. Step 2 — Create the Render web service

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

## 5. Step 3 — Try Test Mode (with your own word), then Offline Mode

1. Open your Render URL.
2. Tap ⚙️ **Settings** → tap the **Mode** row → choose **Test** → pick a
   word length and difficulty.
3. To test a specific scenario: type a word into **"Set the answer
   (Test mode only)"** — it must match the word length you picked.
   Leave it blank for a random word instead.
4. Tap **Apply settings & start new round**. Watch fake viewers "vote"
   on words every few seconds and the green/yellow/red counts update —
   proving the whole pipeline works with no TikTok account needed.
5. Try clicking a few letters on the keyboard to see the manual
   red → yellow → green → none cycle, then tap **Reset colors**.
6. Now try **Offline**: open Settings again, switch Mode to Offline,
   Apply. A guess box appears at the bottom — type a real word of the
   right length and press Enter to play solo.

**Run through Test Mode after any future change** — the fastest way to
confirm the game still works before relying on it live.

---

## 6. Step 4 — Go live with your real TikTok

1. Start your TikTok LIVE broadcast as normal.
2. Open ⚙️ **Settings**, set Mode to **Live**, pick a word length and
   difficulty, tap **Apply settings & start new round**.
3. In the same Settings panel (or the bottom bar), type your TikTok
   **username** (no @) and tap **Connect**.
4. Watch the status chips at the top of Settings — they'll show
   **Connecting…**, then either **LIVE** or a plain-language
   explanation of what went wrong.
5. Tell your audience the rules (or tap ❓ and read it out): type a real
   word of the shown length into chat. Every guess only shows a
   green/yellow/red count, never which letters — that's the game.
6. Tap 💡 any time for a solver hint, **Give up** to end a word early,
   or **Play again** once a round finishes.

---

## 7. Viewing this on your phone while broadcasting

Since your phone is likely busy running the TikTok LIVE broadcast
itself, most hosts use a **second device** (tablet, laptop, or a second
phone) open to the same Render URL to watch the game and tap the
controls. That second screen can also be pointed at a monitor or
propped in frame so your audience can see the board.

The page is still built to behave well on a single phone: the header
stays pinned to the top, and the host controls stay pinned to the
bottom, so you can always reach them no matter how far you've scrolled.

---

## 8. Reading the Diagnostics panel

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

## 9. Troubleshooting common messages

| Message you might see | What it means | What to do |
|---|---|---|
| "No signing key set up yet…" | `EULERSTREAM_API_KEY` isn't set on Render | Add it under Render → Environment, then redeploy |
| "Switch to Live mode first, then connect." | You tried to connect while Mode was Test or Offline | Set Mode to Live and tap Apply first |
| "That TikTok username couldn't be found" | Typo, or the account doesn't exist | Re-check spelling, no @ symbol |
| "That account doesn't look like it's LIVE right now" | You connected before starting the broadcast, or it ended | Start your TikTok LIVE first, then connect |
| "The signing key was rejected" | The key was mistyped or expired | Copy it again from EulerStream and update it on Render |
| "Test word ignored…" | Your custom test word wasn't exactly the selected word length | Retype it to match, or leave it blank for a random word |
| "Cannot GET /" in the browser | The `public` folder didn't upload correctly to GitHub | See the folder-structure note in step 3 |

---

## 10. Making changes later (optional)

- **Add or remove possible secret words:** open `answers.js` on GitHub,
  add or edit an entry under the right letter-length key (4 through
  20), and commit. Avoid adding a word that's just another word on the
  list with an "s" added.
- **Change colors:** open `public/style.css` — all colors are defined
  once at the top under `:root`.
- **Change the vote-window length, attempt pool, or hint count:** open
  `server.js` and adjust `VOTE_WINDOW_SECONDS`, `MAX_ATTEMPTS`, or
  `MAX_HINTS_PER_ROUND` near the top of the file.
- Any edit committed on GitHub triggers an automatic redeploy on Render
  within a minute or two.

---

## What's inside this project (for reference)

- `server.js` — the game engine: aggregate green/yellow/red scoring,
  difficulty filtering, the solver-style hint, TikTok connection,
  modes, and both leaderboards.
- `answers.js` — the curated list of possible secret words, one array
  per length from 4 to 20 letters.
- `dictionary.js` — downloads the 370,000+ word list used to check
  whether a chat comment (or offline guess) is a real, guessable word,
  with a small built-in fallback if the download ever fails.
- `public/index.html`, `public/style.css`, `public/game.js` — the
  screen you and your audience look at, including the manual
  scratchpad keyboard (entirely client-side — the server never sees
  or uses those colors).
- `.env.example` — a reference list of the one setting the app uses.
- `render.yaml` — an optional shortcut for Render's "Blueprint" deploy
  option, instead of the manual steps above.
