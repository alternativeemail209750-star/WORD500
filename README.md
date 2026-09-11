# WORD500 — a live word-guessing game for your TikTok LIVE

This is a complete, ready-to-run web app. You don't need to write or edit
any code. This document walks you through everything: what the game is,
how to put it online, and how to run it during a broadcast.

---

## 1. What you're getting

WORD500 is a word-guessing game show that runs in a web page. Your TikTok
LIVE viewers play by typing their guess directly in TikTok chat — no app,
no login, nothing for them to install.

**How a round works:**
- The game secretly picks a word (Easy / Medium / Hard / Mixed — your choice)
  and shows its category and a row of blank tiles, one per letter.
- Viewers type the word straight into TikTok LIVE chat.
- The first person to type the exact word wins the round.
- The longer a round runs, the fewer points it's worth — rounds start at
  **500 points** and count down over 45 seconds. Two hints appear
  automatically along the way (a fun-fact clue, then a couple of letters)
  — using them lowers the score a bit, so faster and hint-free guesses are
  worth more.
- A **Top 10 leaderboard** keeps a running score across the whole show.
- A **live comment feed** shows what's coming in from chat, so you (and
  your audience, if you share your screen) can see the game react in
  real time.

**The screen is built for your phone.** Host controls (connect, start,
skip, end, Test Mode) sit in a control strip at the bottom that stays on
screen no matter how far you scroll — you'll never lose it mid-broadcast.

---

## 2. One-time setup: get a signing key (do this first)

TikTok doesn't publish an official way for outside apps to read LIVE
chat. This app uses a well-known, widely-used service called
**EulerStream** to do that reliably. Without a key from them, real TikTok
connections will be unreliable or won't work — so set this up first,
before anything else.

1. Go to **https://www.eulerstream.com** and create a free account.
2. Once logged in, find your **API key** on your dashboard (it's usually
   called "API Key" or shown right after sign-up).
3. Copy that key somewhere safe (a Notes app is fine) — you'll paste it
   into Render in step 4 below.

You can skip this for now if you just want to try the game using **Test
Mode** (see step 5), but you'll need it before connecting to a real
TikTok LIVE.

---

## 3. Step 1 — Put the code on GitHub

1. Download all the files I've given you into one folder on your
   computer. Keep the `public` folder as a folder — don't rename or flatten it.
2. Go to **https://github.com** and log in.
3. Click the **+** icon in the top-right corner → **New repository**.
4. Name it something like `word500-game`. Leave it **Public** or
   **Private**, either works. Don't check any of the "initialize with"
   boxes. Click **Create repository**.
5. On the next page, click the link that says **"uploading an existing
   file"**.
6. Open the folder on your computer where you saved everything, select
   **all the files and folders inside it** (including the `public`
   folder), and **drag them all** onto the GitHub upload box at once.
   GitHub will preserve the folder structure automatically.
7. Scroll down and click the green **Commit changes** button.

Your code is now on GitHub. You won't need to touch GitHub again unless
you want to change something later.

---

## 4. Step 2 — Create the Render web service

1. Go to **https://render.com** and log in.
2. Click **New +** → **Web Service**.
3. Choose **"Build and deploy from a Git repository"** and connect your
   GitHub account if it asks you to.
4. Select the `word500-game` repository you just created.
5. Render will show a settings form. Fill it in like this:
   - **Name:** anything you like, e.g. `word500-game`
   - **Region:** whichever is closest to you
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free is fine to start
6. Before clicking create, scroll to **Environment Variables** and add
   one:
   - **Key:** `EULERSTREAM_API_KEY`
   - **Value:** paste the key you copied from EulerStream in step 2
   (If you don't have a key yet, skip this — you can add it later from
   the **Environment** tab on the left, then click **Manual Deploy** to
   restart the app with it.)
7. Click **Create Web Service**.

Render will now build and start your app — this takes a couple of
minutes the first time. When it's done, you'll see a **live URL** at the
top of the page, something like `https://word500-game.onrender.com`.
That's your game.

**Free plan note:** Render's free tier goes to sleep after periods of
no visitors and takes about 30–60 seconds to wake back up on the next
visit. Open your game's URL a few minutes before you go live so it's
already awake.

---

## 5. Step 3 — Test it before you ever go live

1. Open your Render URL on your phone or computer.
2. Scroll to the bottom and tap **Host controls** if it isn't already
   open.
3. Turn on **Test Mode — try the game with no TikTok connection**.
4. Tap **Start game**. You'll see fake viewers "chatting" and
   occasionally guessing correctly — this proves the whole pipeline
   (comments coming in → being recognized → scoring → leaderboard) works,
   with no TikTok account needed.
5. Turn Test Mode back off when you're done checking.

**Run through this Test Mode check after any future change** you make to
the app — it's the fastest way to know the game still works before you
rely on it live.

---

## 6. Step 4 — Go live with your real TikTok

1. Start your TikTok LIVE broadcast as normal, from your phone, as you
   always do.
2. On your WORD500 page, open **Host controls**, type your TikTok
   **username** (the one you're broadcasting from — without the @) into
   the box, and tap **Connect**.
3. Watch the status pill at the top of the screen and the **Diagnostics**
   panel:
   - It will say **Connecting…**, then either **LIVE** (you're
     connected and receiving chat) or show a plain-language message
     explaining what went wrong (see the troubleshooting table below).
4. Pick a difficulty from the dropdown and tap **Start game**.
5. Read your secret word's category out loud, tell your audience to type
   their guess in chat, and let the game run itself — tiles fill in with
   hints automatically, the leaderboard updates itself, and the next
   round starts on its own a few seconds after each win or timeout.
6. Use **Skip word** any time you want to move on early, and **End
   game** to stop and reset the leaderboard for a fresh show later.

---

## 7. Viewing this on your phone while broadcasting

Since your phone is likely busy running the TikTok LIVE broadcast
itself, most hosts use a **second device** (tablet, laptop, or a second
phone) open to the same Render URL to watch the game and tap the
controls, while the TikTok broadcast itself runs on the primary phone.
That second screen can also be pointed at a monitor or propped in frame
so your audience can see it.

The page itself is built so that on a single phone it still behaves
well: the header always stays pinned to the top, and the host controls
strip always stays pinned to the bottom, so you can always see the score
and reach the buttons no matter how far you've scrolled through the
comment feed or leaderboard.

---

## 8. Reading the Diagnostics panel

This panel exists so you can see exactly what's happening without ever
needing to look at server logs.

| Line | What it tells you |
|---|---|
| **Raw events received** | Total chat messages received from TikTok (or Test Mode) since the app started. If this number is stuck at 0 while you know people are chatting, the connection itself isn't receiving anything. |
| **Last received** | The most recent username and message the app saw — proves messages are arriving even if nobody has guessed correctly yet. |
| **Connection status** | Idle / Connecting / LIVE / Test Mode / Connection issue / Disconnected. |
| **Signing key set up?** | Whether `EULERSTREAM_API_KEY` is configured on Render. Must say "Yes" before real TikTok connections will work. |
| **Retry attempts** | How many times the app has automatically retried a failed connection (it tries up to 3 times on its own before giving up and asking you to try again). |
| **Last message** | A plain-language note about the most recent problem, if any. |

**If "Raw events received" is going up but nobody is winning rounds:**
that means chat is arriving fine, but guesses simply aren't matching the
secret word yet — nothing is broken.

**If "Raw events received" stays at 0 while connected:** double-check
you're broadcasting under the same username you typed in, and that the
broadcast is fully live (not still on the "starting soon" screen).

---

## 9. Troubleshooting common messages

| Message you might see | What it means | What to do |
|---|---|---|
| "No signing key set up yet…" | `EULERSTREAM_API_KEY` isn't set on Render | Add it under Render → Environment, then redeploy |
| "That TikTok username couldn't be found" | Typo, or the account doesn't exist | Re-check the spelling, no @ symbol |
| "That account doesn't look like it's LIVE right now" | You typed the username before starting the broadcast, or it ended | Start your TikTok LIVE first, then connect |
| "The signing key was rejected" | The key was mistyped or has expired | Copy it again from EulerStream and update it on Render |
| "Couldn't connect to TikTok LIVE after several tries" | Temporary network hiccup | Wait a few seconds and tap Connect again |

---

## 10. Making changes later (optional)

- **Add or change words:** open `words.js` on GitHub (click the file,
  then the pencil icon to edit), add a line following the same pattern
  as the others, and commit. Render will redeploy automatically.
- **Change colors:** open `public/style.css` — the colors are defined
  once at the very top of the file under `:root`, so changing a value
  there changes it everywhere.
- Any time you edit a file on GitHub and commit the change, Render
  detects it and redeploys automatically within a minute or two.

---

## What's inside this project (for reference, you never need to open these)

- `server.js` — the game engine: connects to TikTok, tracks rounds and
  scores, and keeps every connected browser in sync.
- `words.js` — the word bank (easy / medium / hard).
- `public/index.html`, `public/style.css`, `public/game.js` — the screen
  you and your audience look at.
- `.env.example` — a reference list of the one setting the app uses
  (your signing key). You configure the real value in Render, not in
  this file.
- `render.yaml` — an optional shortcut Render can read to pre-fill the
  setup form if you ever create the service via "New + → Blueprint"
  instead of the manual steps above.
