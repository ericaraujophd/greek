# Design

How the companion is put together and why, so later units and features can
be added without re-deciding the basics. Setup steps are in the README.

## Goals and constraints

1. **A companion to the course, not a product.** It follows the syllabus of
   Greek Fundamentals I (24 units, Mounce ch. 1 to 21) and does what paper
   cannot: spaced repetition, drills weighted by your own mistakes, real NT
   forms and verses, scores over months. Mounce and class stay the spine.
2. **Scores, not gates.** Every check and quiz can be retaken; the best score
   is shown. Nothing is locked behind a score.
3. **Invitation only**, @calvinseminary.edu Google accounts.
4. **Runs on your Mac first.** Edit, reload, see it. Hosting is decided later.
5. **Readable code.** Heavy comments, no front-end framework, few dependencies.

## Architecture

```
Browser                          API server (server/)              Neon Postgres
 website (src/)  ── HTTPS ──▶     Hono on Node (later Workers) ──▶   people + activity
   content in the repo            Bearer session token
   outbox for answers             checks invitation on every call
```

- **Website**: Vite + TypeScript, plain DOM through a small `h()` helper
  (`src/lib/dom.ts`), hash routes (`src/router.ts`) because GitHub Pages is a
  plain file server. Still a PWA (installable, caches the app and font).
- **API**: Hono (`server/app.ts`), a small router that runs unchanged on Node
  (now, `server/index.ts`) and Cloudflare Workers (later).
- **Database access**: `@neondatabase/serverless` over HTTP in development
  and production; PGlite (Postgres compiled to WebAssembly) in tests, so
  `npm test` needs no database. Both behind the same `Db` interface
  (`server/db.ts`). Migrations are plain SQL files run in order.

### Sign-in

1. Google Identity Services shows "Continue with Google" with `hd` set to the
   seminary domain, and hands the page an ID token.
2. The API verifies it against Google's public keys (`jose`), checks the
   domain, then checks the invitation list (or `ADMIN_EMAILS`).
3. It returns its own session token (HS256, 30 days). The page keeps it in
   localStorage and sends it as `Authorization: Bearer`. Cookies are not used
   because the website and API are on different origins.
4. Every signed-in request re-checks the invitation, so revoking takes effect
   at once. Revoked or expired: the page goes back to sign-in.

`DEV_LOGIN=1` adds a "Developer sign-in" that skips Google but still applies
the invitation rules. Never set it on a public server.

## Data

### Content (in the repo)

| File | What |
| --- | --- |
| `src/content/units.ts` | The 24 units, practice quizzes, chapter word lists |
| `src/content/lessons/*.ts` | Per unit: before-checklist, key ideas, paradigms, concept questions |
| `src/content/questions.ts` | Builds every kind of question from the above |
| `src/content/generated/*.json` | From `npm run build:data`: NT forms per lemma, glosses and frequencies, readings per unit |

Drafted content is marked as such. An admin marks each part (key ideas,
words, practice check) as checked; students only see checked parts.
`lessons.test.ts` checks every paradigm form against forms that occur in
the NT, so a typo in a table fails the tests.

### People and activity (Neon)

`server/migrations/001_init.sql`: invitations, users, cards (FSRS state per
card), answers (every answer, for accuracy and "missed this week"), scores
(every attempt), notes, unit_progress (checklist; a row means "opened"),
content_status.

Answers and card updates go through an **outbox** in localStorage
(`src/lib/api.ts`) and are sent in batches every 20 seconds, when the tab is
hidden and when the connection returns. Nothing is lost on a flaky network.

## Questions

- **Words**: flashcards (Greek to meaning), self-graded Again/Hard/Good/Easy.
- **Paradigm cells**: "dat. pl. of λόγος?", multiple choice from the same column.
- **Parsing**: real NT forms (MorphGNT), only cases taught by that unit;
  forms with several valid readings (neuter nom./acc.) accept each one.
- **Concepts**: multiple choice about the unit's ideas, with the reason.

Practice check per unit: up to 12 mixed questions. Practice quizzes follow
the syllabus quizzes (Q1 to Q5, exam), 20 questions over their units.

## Spaced repetition

FSRS via `ts-fsrs`, target retention 90%. Review session (`views/review.ts`):
cards due first, then up to 15 new a day, with a parse question every few
cards weighted toward forms you have missed.

## Pronunciation

Erasmian. Browser Greek voices speak modern Greek, so an English voice reads
the transliteration and the button says "approximate". Real recordings can
replace it later as files in `public/audio/`.

## The alphabet drills

The first version's alphabet module (`src/modules/alphabet/`) is kept as is,
linked from unit 2. Its progress still lives in the browser
(`src/lib/store.ts`), not in the database; moving it is a later step.

## Adding a unit

1. Fill in its words in `src/content/units.ts` (lemma exactly as MorphGNT),
   set `drafted: true`.
2. Add a `Lesson` in `src/content/lessons/`, register it in `index.ts`.
3. `npm run build:data` (new words get NT forms and readings), `npm test`.
4. Open it as admin, check, mark checked.
