# WORD500 — a live Wordle-style word game for your TikTok LIVE

This is a complete, ready-to-run web app. You don't need to write or edit
any code. This document explains the game rules and walks you through
putting it online.

---

## 1. What you're getting

WORD500 is the classic hidden-word guessing game (in the style of
Wordle) — played live, by your whole TikTok audience at once.

**How it works:**
- The game secretly picks a word (4, 5, or 6 letters — your choice) and
  shows a row of blank tiles for it.
- Every few seconds is a **voting round**: anyone in TikTok LIVE chat
  can type a real word of the right length. Whichever word gets typed
  the most during that window becomes the audience's official guess.
- That guess is scored exactly like Wordle:
  - 🟩 **Green** = right letter, right spot
  - 🟨 **Gold** = right letter, wrong spot
  - 🟥 **Red** = letter isn't in the word
- The on-screen keyboard colors itself in automatically as clues come
  in, so your whole audience can see at a glance which letters are
  confirmed, close, or ruled out.
- The audience shares a pool of **15 attempts** to find the word. Get it
  before attempts run out, or the answer is revealed and the round ends.
- A **🔥 win streak** counter climbs every time the audience solves a
  word, and resets if they run out of attempts or you tap **Give up**.
- A **Top 10 leaderboard** tracks which viewers' comments most often
  became "the" guess for a round — a fun way to recognize your most
  engaged chatters.

**Any real English word can be typed as a guess** — the game checks
comments against a list of over 370,000 English words, so your audience
isn't limited to some small pre-set list.

**"Start with N random guesses"** is an optional host setting: it burns
1–3 attempts on random real words before chat voting opens, so there's
already some color-coded information on the board when your audience
jumps in. Totally optional — leave it on "No quick start" for the full
experience.

---

## 2. One-time setup: get a signing key (do this first)

TikTok doesn't publish an official way for outside apps to read LIVE
chat, so this app uses a well-known, widely-used service called
**EulerStream** to do that reliably. Set this up before anything else —
without a key, real TikTok connections will be unreliable or won't work.

1. Go to **https://www.eulerstream.com** and create a free account.
2. Once logged in, find your **API key** on your dashboard.
3. Copy it somewhere safe (a Notes app is fine) — you'll paste it into
   Render in step 4 below.

You can skip this for now if you just want to try the game using **Test
Mode** (see step 5), but you'll need it before connecting to a real
TikTok LIVE.

---

## 3. Step 1 — Put the code on GitHub

1. Download all the files I've given you into one folder on your
   computer. Keep the `public` folder as a folder — don't rename or
   flatten it.
2. Go to **https://github.com** and log in.
3. Click the **+** icon in the top-right corner → **New repository**.
4. Name it something like `word500-game`. Public or Private both work.
   Don't check any "initialize with" boxes. Click **Create repository**.
5. On the next page, click **"uploading an existing file"**.
6. Open the folder on your computer, select **all the files and folders
   inside it** (including the `public` folder), and **drag them all**
   onto the GitHub upload box at once. GitHub preserves the folder
   structure automatically.
7. Scroll down and click the green **Commit changes** button.

You can double-check afterward that your repo looks like this:

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

If `public/` isn't its own folder in the file list (its 3 files are
sitting loose at the top level instead), the upload didn't preserve the
structure — delete those loose files and re-drag the `public` folder by
itself.

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

## 5. Step 3 — Test it before you ever go live

1. Open your Render URL.
2. Open **Host controls** at the bottom if it isn't already open.
3. Turn on **Test Mode**.
4. Pick a word length and tap **Start game**. You'll see fake viewers
   "voting" on words every few seconds, tiles filling in with colors,
   the keyboard coloring itself, and eventually a win or loss — proving
   the whole pipeline works with no TikTok account needed.
5. Turn Test Mode back off when you're done.

**Run this Test Mode check after any future change** — the fastest way
to know the game still works before relying on it live.

---

## 6. Step 4 — Go live with your real TikTok

1. Start your TikTok LIVE broadcast as normal.
2. Open **Host controls**, type your TikTok **username** (no @) into the
   box, and tap **Connect**.
3. Watch the status pill at the top and the **Diagnostics** panel — it
   will show **Connecting…**, then either **LIVE** or a plain-language
   explanation of what went wrong.
4. Pick a word length (difficulty) and tap **Start game**.
5. Tell your audience the rules (or tap the hamburger menu → "How to
   play" and read it out): type a real word of the shown length into
   chat to vote for it. The game handles scoring, the keyboard, the
   leaderboard, and streaks automatically.
6. Use **Give up** any time to end the current word early (this reveals
   the answer and resets the streak), and tap **New game** when you're
   ready for the next word.

---

## 7. Viewing this on your phone while broadcasting

Since your phone is likely busy running the TikTok LIVE broadcast
itself, most hosts use a **second device** (tablet, laptop, or a second
phone) open to the same Render URL to watch the game and tap the
controls. That second screen can also be pointed at a monitor or
propped in frame so your audience can see the board.

The page is still built to behave well on a single phone: the header
stays pinned to the top, and the host controls always stay pinned to
the bottom, so you can always see the game and reach the buttons no
matter how far you've scrolled through the leaderboard or comments.

---

## 8. Reading the Diagnostics panel

| Line | What it tells you |
|---|---|
| **Raw events received** | Total chat messages received since the app started. Stuck at 0 while people are chatting? The connection isn't receiving anything. |
| **Last received** | The most recent username and message seen — proves messages are arriving even if nobody's guessed a valid word yet. |
| **Connection status** | Idle / Connecting / LIVE / Test Mode / Connection issue / Disconnected. |
| **Signing key set up?** | Whether `EULERSTREAM_API_KEY` is configured on Render. Must say "Yes" before real TikTok connections work. |
| **Word dictionary** | How many words the guess-checker loaded. Should read "370,xxx words (full list)" — if it says "fallback list" instead, the one-time download from GitHub failed on startup (rare); the game still works, just with a much smaller recognized word list until the next restart. |
| **Retry attempts** | How many times the app auto-retried a failed TikTok connection (up to 3, on its own). |
| **Last message** | A plain-language note about the most recent problem, if any. |

**If "Raw events received" is climbing but no round is resolving:**
that's normal — it just means nobody's typed a matching-length real word
yet this round; nothing is broken.

---

## 9. Troubleshooting common messages

| Message you might see | What it means | What to do |
|---|---|---|
| "No signing key set up yet…" | `EULERSTREAM_API_KEY` isn't set on Render | Add it under Render → Environment, then redeploy |
| "That TikTok username couldn't be found" | Typo, or the account doesn't exist | Re-check spelling, no @ symbol |
| "That account doesn't look like it's LIVE right now" | You connected before starting the broadcast, or it ended | Start your TikTok LIVE first, then connect |
| "The signing key was rejected" | The key was mistyped or expired | Copy it again from EulerStream and update it on Render |
| "Couldn't connect to TikTok LIVE after several tries" | Temporary network hiccup | Wait a few seconds and tap Connect again |
| "Cannot GET /" in the browser | The `public` folder didn't upload correctly to GitHub | See the folder-structure note at the end of step 3 |

---

## 10. Making changes later (optional)

- **Add or remove possible secret words:** open `answers.js` on GitHub
  (click the file, then the pencil icon), add or edit an entry in the
  4/5/6-letter list, and commit. Avoid adding a word that's just another
  word on the list with an "s" added — pick words that feel like their
  own thing (e.g. `mineral`, not `minerals`).
- **Change colors:** open `public/style.css` — all colors are defined
  once at the top under `:root`.
- **Change the vote-window length or attempt pool:** open `server.js`
  and adjust `MAX_ATTEMPTS` or `VOTE_WINDOW_SECONDS` near the top of the
  "GAME STATE" section.
- Any edit committed on GitHub triggers an automatic redeploy on Render
  within a minute or two.

---

## What's inside this project (for reference)

- `server.js` — the game engine: connects to TikTok, runs the voting
  window and scoring, and keeps every connected browser in sync.
- `answers.js` — the small curated list of possible secret words.
- `dictionary.js` — downloads the 370,000+ word list used to check
  whether a chat comment is a real, guessable word (with a small
  built-in fallback list if the download ever fails).
- `public/index.html`, `public/style.css`, `public/game.js` — the
  screen you and your audience look at.
- `.env.example` — a reference list of the one setting the app uses.
  You configure the real value in Render, not in this file.
- `render.yaml` — an optional shortcut Render can read if you ever
  create the service via "New + → Blueprint" instead of the manual
  steps above.
