# Design

This file explains how the app is put together and why, so that each new
module can be added without re-deciding the basics.

## Goals and constraints

1. **Serve the plan, not replace it.** Mounce and the workbook are the spine.
   The app does what paper cannot: spaced repetition, timed drills, drills
   weighted by your own mistakes, and progress over months.
2. **Lives at ericaraujo.com/greek.** A separate repo (`greek`) published by
   GitHub Pages. Because the user site `ericaraujophd.github.io` has the
   custom domain `ericaraujo.com`, a project repo automatically appears at
   `ericaraujo.com/<repo>/`. The main website is never touched.
3. **Progress lives in git**, as JSON, in a private repo. No database server.
4. **Works on the Mac, the iPad mini and the phone**, including offline.
5. **Readable code.** Heavy comments, no framework, few dependencies.

## Architecture

```
Browser (any device)
 ├─ App: static files from GitHub Pages (HTML, JS, CSS, font)
 │    service worker caches it all -> works offline
 ├─ localStorage: progress (updated on every answer), settings, device id
 └─ sync.ts ── GitHub REST API (Contents) ──> ericaraujophd/greek-progress/progress.json
```

### Why no framework

Each screen is a function that returns DOM built with a 40-line helper
(`src/lib/dom.ts`). The whole app is ~70 KB of JavaScript. There is no
build-time magic to relearn in a year, and nothing to upgrade.

### Why Vite + TypeScript

TypeScript catches the class of bugs that would otherwise surface as a
wrong drill answer. Vite builds in under a second and handles the service
worker (`vite-plugin-pwa`) and the bundled font.

### Routing

Hash routes (`#/alphabet/speed`), because GitHub Pages is a plain file server
and would 404 on `/greek/alphabet/speed`. See `src/router.ts`.

## Data

### Content (in the repo, versioned with the code)

`src/modules/<module>/data.ts`. Content that is small and hand-curated
(alphabet, John 1:1 to 5) is TypeScript, so a typo fails `npm test`
(`data.test.ts`) instead of confusing a learner.

Later modules need real NT data. Plan:

- **Morphology** (every word of the NT with lemma and parsing):
  [MorphGNT / SBLGNT](https://github.com/morphgnt/sblgnt), CC BY-SA.
  A script in `scripts/` will turn it into compact JSON per chapter,
  loaded on demand, so the app stays small.
- **Glosses**: STEPBible data (CC BY 4.0) or the Dodson lexicon (public domain).
- **Vocabulary lists by Mounce chapter**: Mounce's lists are copyrighted,
  so the app will hold only the list of lemmas per chapter (a fact about the
  book, not its text), with glosses from the open lexicon above.

### Progress (in `greek-progress/progress.json`)

```json
{
  "schema": 1,
  "cards":    { "alpha:lambda:read": { "due": "...", "stability": 3.1, "...": "...", "updatedAt": "..." } },
  "stats":    { "alpha:lambda": { "dev-1a2b3c4d": { "seen": 40, "correct": 37 } } },
  "sessions": [ { "id": "...", "deviceId": "...", "start": "...", "end": "...", "counts": { "speed": 20 } } ]
}
```

Ids are prefixed by module (`alpha:`, `type:`, `read:`, later `noun:`,
`vocab:`, `parse:`), so every module shares one file and one sync.

### Why git-backed JSON (and how its weak spots are handled)

Chosen over a hosted database (Supabase) to keep everything in GitHub with no
extra service. The known costs and the mitigations:

| Cost | Mitigation |
| --- | --- |
| A token in the browser | Fine-grained token, one private repo, Contents only, stored per device, never in code. Revocable per device. |
| Every save is a commit | Local-first: answers save to localStorage instantly; GitHub gets one push per session (manual button, 15-minute auto-save, or when the app is hidden, with a 5-minute floor). |
| Two devices can collide | The file is designed to merge without conflicts (below). A stale write (HTTP 409/422) re-pulls, re-merges and retries. |
| Slower than a database | Only matters at load and save. Drills never wait on the network. |
| Offline | Everything works offline; sync resumes later. |

If this ever becomes limiting (e.g. syncing on every answer), the store is
isolated in `store.ts` + `sync.ts`, and swapping in Supabase touches only
`sync.ts`.

### Conflict-free merge

`mergeProgress(a, b)` in `store.ts` (tested in `store.test.ts`):

- **cards**: newest `updatedAt` wins (a card is reviewed on one device at a time).
- **stats**: counters are per device and only grow, so the merge takes the
  max per device and totals are sums across devices (a grow-only counter
  CRDT). Merging the same data twice never double-counts.
- **sessions**: union by id.

The merge is commutative and idempotent, so it does not matter which device
syncs first or how often.

## Spaced repetition

FSRS (the algorithm Anki now defaults to), via `ts-fsrs`, target retention
90%. `srs.ts` converts its Date objects to JSON-friendly strings. Queue rules
(`alphabet/cards.ts`): due reviews first, then new cards (daily limit,
default 18 = one batch of six letters), then learning cards up to 20 minutes
early so a session never stalls. Batches open automatically when every card
of the previous batch has graduated.

## Pronunciation and audio

Erasmian, as in Mounce and at the seminary. There is deliberately no
text-to-speech: browser Greek voices speak modern Greek, which pronounces
several letters differently and would teach the wrong sounds. For listening,
use Mounce's free vocabulary audio on billmounce.com.

## Adding a module

1. `src/modules/<name>/` with `data.ts` (+ `data.test.ts`) and one file per screen.
2. Register routes in `src/main.ts`.
3. Flip its tile to `ready: true` in `src/views/home.ts`.
4. Reuse `components/mcround.ts` for any multiple-choice drill.
5. Use a new id prefix for its cards and stats. No sync changes needed.
