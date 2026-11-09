# Greek Companion

A study companion for **Greek Fundamentals I** at Calvin Theological Seminary,
used alongside William D. Mounce, *Basics of Biblical Greek* (4th ed.). It
follows the course's 24 units (Mounce ch. 1 to 21) at your own pace: key ideas,
paradigms and words for each unit, a daily review, practice checks and
quizzes, and real New Testament verses at your level.

An independent project, open by invitation to @calvinseminary.edu Google
accounts. It is not affiliated with Zondervan or with Mounce's materials:
all explanations are our own wording, and no text from the book is reproduced.

## How it fits together

```
 your browser                      your Mac (for now)                  Neon
 ───────────                       ──────────────────                  ────
 website (Vite, port 5173)  ──▶   API server (Hono, port 8787)  ──▶   Postgres
   course content is in the         sign-in, invitations,               people and
   repo (src/content/)              progress, scores, admin             their activity
```

- **Content** (units, lessons, paradigms, words, NT readings) lives in the
  repo as TypeScript and JSON. Change it, reload, done.
- **The database** holds only people and what they did: invitations, users,
  flashcard schedules, answers, scores, notes, checklists, and which drafted
  content you have checked.
- **Sign-in** is Google, restricted to @calvinseminary.edu, and only for
  addresses on the invitation list (plus `ADMIN_EMAILS`).

More detail and the reasons behind each choice: [DESIGN.md](DESIGN.md).

## First-time setup on your Mac

You need Node 20 or newer (`node -v`).

### 1. Install

```bash
cd ~/Documents/Claude/Projects/greek
npm install
cp .env.example .env
```

### 2. Neon (the database)

1. Sign in at https://console.neon.tech and click **New Project**.
   Project name `greek`; Region **AWS US East 2 (Ohio)**; under Services
   leave only **Postgres database** on (no Neon Auth, the app has its own
   sign-in). Click **Create project**.
2. The project starts with one branch, **production**. Keep it for when the
   site goes live. Open **Branches** > **New branch**: Name `dev`,
   Auto-delete **Never**, Parent branch `production`, and keep the default
   **Branch data and schema** (production is empty, so nothing is copied).
   Click **Create**.
3. Click **Connect**. In "Connect to your branch" choose branch `dev`,
   database `neondb`, role `neondb_owner`; Connection pooling can stay on.
   Copy the connection string (starts with `postgresql://`, includes the
   password).
4. Paste it into `.env` as `DATABASE_URL=...` (one line, no quotes).

The tables are created automatically the first time the server starts
(`server/migrations/`). To run migrations by hand: `npm run db:migrate`.

No Neon yet? Set `DATABASE_URL=pglite` for an in-memory database that
disappears when the server stops.

### 3. Session secret

```bash
openssl rand -base64 48
```

Paste the result into `.env` as `SESSION_SECRET=...`. Changing it later
signs everyone out.

### 4. Google sign-in (can wait)

With `DEV_LOGIN=1` you can sign in by typing an invited address, no Google
needed. When you want the real thing:

1. https://console.cloud.google.com, create a project `greek-companion`.
2. **APIs & Services > OAuth consent screen**: External, app name "Greek
   Companion", your email as support and developer contact. Scopes: just
   the defaults (email, profile, openid). Add yourself as a test user.
3. **APIs & Services > Credentials > Create credentials > OAuth client ID**:
   type *Web application*, Authorized JavaScript origins:
   `http://localhost:5173` (later also `https://ericaraujo.com`). No
   redirect URIs needed.
4. Copy the client ID (`...apps.googleusercontent.com`) into `.env` as
   `GOOGLE_CLIENT_ID=...`.

### 5. Run it

```bash
npm run dev
```

This starts the website (http://localhost:5173/greek/) and the API
(http://localhost:8787) together; both reload when you edit files. Sign in
with `efer251@calvinseminary.edu` (an admin through `ADMIN_EMAILS`).

## Everyday use

| You want to | Do this |
| --- | --- |
| Study | Dashboard > the unit you are on > review, practice check, read |
| Check a unit I drafted | Open the unit as admin. Each draft part has a yellow banner and a "Mark … checked" button. Students see a part only after it is checked. The Admin page has the same switches for all units. |
| Invite someone | Admin > Invitations, paste one or more @calvinseminary.edu addresses. No email is sent: tell them yourself. |
| Remove someone | Admin > Invitations > Revoke. Their next request is refused. |
| Fix a word, gloss or table | Edit `src/content/units.ts` or `src/content/lessons/*.ts`, then `npm test` (it checks every paradigm form against the NT). |

Keyboard everywhere: `1` to `4` answer, `space` or `Enter` continues.

## Commands

```bash
npm run dev          # website + API, both reloading
npm run web          # website only
npm run api          # API only
npm run db:migrate   # apply database migrations
npm run build:data   # rebuild NT forms, glosses and readings from data/
npm test             # unit and API tests (no database needed: uses PGlite)
npm run build        # type check + production build into dist/
npm run test:e2e     # full browser test against a throwaway API
                     # (first time: npx playwright install chromium)
```

## GitHub Pages, for now

Pushing to `main` still publishes the website to https://ericaraujo.com/greek/.
That copy talks to the API at `http://localhost:8787`, so it only works on
your Mac while `npm run dev` (or `npm run api`) is running, and only if
`.env` has `WEB_ORIGIN=http://localhost:5173,https://ericaraujo.com`.
Other students need a hosted API; that is the next decision (Cloudflare
Workers is the likely choice: the server is written for it already).

## Credits and licences

- Greek NT text, parsing and frequencies: [MorphGNT](https://github.com/morphgnt/sblgnt)
  (CC BY-SA 3.0), based on the SBL Greek New Testament, copyright 2010 Society
  of Biblical Literature and Logos Bible Software.
- Short lexicon glosses for words not yet learned: Dodson Greek-English
  Lexicon (public domain, CC0).
- Videos: links only, to Bill Mounce's chapter overviews and workbook
  screencasts on billmounce.com.
- Extra listening: links only, to Ted Hildebrandt's free audio
  (biblicalelearning.org, free for non-commercial use).
- Pronunciation audio: recorded by the site's admins and stored in the
  database (`audio` table). There is no computer-generated speech.
- Font: Gentium Book Plus, SIL International (SIL Open Font License).
- Scheduler: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT).
- Unit structure follows the course syllabus; chapter numbers refer to
  Mounce, *Basics of Biblical Greek*, 4th ed. (Zondervan). No text from the
  book is reproduced.
