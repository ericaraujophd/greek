# Greek

Personal Koine Greek study tools, built to sit on top of William D. Mounce,
*Basics of Biblical Greek* (4th ed.), during a year of self-study before
taking Greek at Calvin Theological Seminary in Fall 2027.

Live at **https://ericaraujo.com/greek/**

## What is here now

The **Alphabet** module (Mounce ch. 1 to 4, plan weeks 1 and 2):

| Drill | What it trains |
| --- | --- |
| Learn | All 24 letters: name, Erasmian sound, transliteration, NT example, traps |
| Flashcards | 72 spaced-repetition cards (read, write, capital), FSRS scheduler, batches of six that open as you learn them |
| Speed | 20-question rounds, weighted toward your weakest letters, with look-alike distractors |
| Look-alikes | ν is not v, η is not n, ρ is not p, ω is not w, χ is not x; plus Greek twins (ζ/ξ, ν/υ, ο/ω, ε/η) |
| Typing | The standard Greek keyboard layout, letters then whole words |
| Sound it out | Read every word of John 1:1 to 5 aloud and type its transliteration |

Planned modules (see the home screen): breathings and accents, noun endings,
vocabulary, the reader, parsing. Each is built the week before the plan needs it.

## Using it

- Open the site on any device. On the iPad or phone, use Share > Add to Home
  Screen: it then opens like an app and works offline.
- Progress saves in the browser immediately, and syncs to the private repo
  `ericaraujophd/greek-progress` (file `progress.json`) about once per
  session. Set up sync once per device on the Settings page.
- Keyboard: `1` to `4` answer, `space` flips or continues, `enter` starts
  another round.

## Developing

```bash
npm install
npm run dev        # http://localhost:5173/greek/
npm test           # unit tests (Greek text helpers, merge logic, data checks)
npm run build      # type check + production build into dist/
npm run test:e2e   # browser smoke test (needs a build first)
```

Every push to `main` runs the tests, builds, and publishes to GitHub Pages
(`.github/workflows/deploy.yml`).

How the pieces fit, and why they were chosen, is in [DESIGN.md](DESIGN.md).

## Credits and licences

- Greek text of John 1:1 to 5: Westcott and Hort (public domain).
- Font: Gentium Book Plus, SIL International (SIL Open Font License).
- Scheduler: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT).
- Letter names, sounds and transliteration follow Mounce's scheme; no text
  from the book is reproduced.
