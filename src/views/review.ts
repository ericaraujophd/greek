/**
 * review.ts: the daily review (#/review).
 *
 * WHAT IS IN THE DECK
 *   For every unit you have opened:
 *     word:<lemma>          one flashcard per word (Greek -> meaning)
 *     cell:<table>:<r>:<c>  one card per paradigm cell ("dat. pl. of λόγος?")
 *   Cards follow the FSRS schedule (lib/srs.ts), like Anki.
 *
 * A SESSION
 *   1. Every card that is due, oldest first.
 *   2. New cards, up to 15 a day, in course order.
 *   3. Mixed in: one parse question (a real NT form) after every few cards,
 *      chosen from the units you have opened and weighted toward the forms
 *      you have missed. Parse questions are not scheduled cards; they keep
 *      the endings sharp.
 *
 * GRADING
 *   Word cards: you reveal the meaning and rate yourself (Again / Hard /
 *   Good / Easy). Paradigm cells are multiple choice: right = Good,
 *   wrong = Again, so the card comes back soon.
 */
import { h, mount } from '../lib/dom';
import { appHeader } from '../components/layout';
import { renderQuestion } from '../components/question';
import { cardOf, isStarted, rateCard, recordAnswer, weightOf, localDay } from '../lib/progress';
import { isDue, isNew, previewIntervals, Rating, type Grade } from '../lib/srs';
import { cellQuestions, LEXICON, parseQuestions, type Question } from '../content/questions';
import { LESSONS } from '../content/lessons';
import { UNITS, type Unit } from '../content/units';
import { setKeyHandler } from '../router';

const NEW_PER_DAY = 15;
const PARSE_EVERY = 4;

function startedUnits(): Unit[] {
  return UNITS.filter((u) => isStarted(u.id));
}

/** Every card id the student currently has, in course order. */
export function reviewDeck(): string[] {
  const ids: string[] = [];
  const units = startedUnits();
  for (const u of units) for (const w of u.words) ids.push(`word:${w.lemma}`);
  // Paradigm cells: only tables shown in a unit the student has opened.
  const tables = new Set(units.flatMap((u) => (LESSONS[u.id]?.paradigms ?? []).map((p) => p.id)));
  const last = units[units.length - 1];
  if (last) for (const q of cellQuestions(last.n)) if (tables.has(q.itemId.split(':')[1])) ids.push(q.itemId);
  return [...new Set(ids)];
}

function introducedToday(): number {
  const today = localDay(new Date());
  return reviewDeck().filter((id) => { const c = cardOf(id); return c.introduced && localDay(new Date(c.introduced)) === today; }).length;
}

/** The queue for right now: due first, then new (daily limit). */
function buildQueue(): string[] {
  const deck = reviewDeck();
  const due = deck.filter((id) => { const c = cardOf(id); return !isNew(c) && isDue(c); })
    .sort((a, b) => cardOf(a).due.localeCompare(cardOf(b).due));
  const fresh = deck.filter((id) => isNew(cardOf(id))).slice(0, Math.max(0, NEW_PER_DAY - introducedToday()));
  return [...due, ...fresh];
}

export function reviewView(): Node {
  const root = h('div', { class: 'drill' });
  const units = startedUnits();
  const last = units[units.length - 1];
  let done = 0;
  let sinceParse = 0;

  if (!units.length) {
    mount(root, h('div', { class: 'panel stack' },
      h('h1', { class: 'serif', style: 'margin:0;font-size:30px' }, 'Nothing to review yet'),
      h('p', { class: 'muted', style: 'margin:0' }, 'Open a unit first. Its words and paradigms then join your review.'),
      h('a', { class: 'btn primary', href: '#/dashboard' }, 'Back to the dashboard')));
    return h('div', {}, appHeader(), h('main', { class: 'page wrap' }, root));
  }

  const cells = new Map(cellQuestions(last.n).map((q) => [q.itemId, q]));

  function next() {
    const queue = buildQueue();
    // A parse question every few cards, and to finish off when the queue is empty.
    if (last && (sinceParse >= PARSE_EVERY || !queue.length) && done < 60) {
      const [pq] = parseQuestions(last, 1, Math.random, weightOf);
      if (pq && (sinceParse >= PARSE_EVERY || done === 0 || !queue.length)) {
        sinceParse = 0;
        if (queue.length || done < 3) return showQuestion(pq, 'review', () => { done++; next(); });
      }
    }
    if (!queue.length) return finish();
    sinceParse++;
    const id = queue[0];
    if (id.startsWith('cell:')) {
      const q = cells.get(id);
      if (!q) { rateCard(id, Rating.Good); return next(); }
      return showQuestion(q, 'review', () => { done++; next(); }, (ok) => rateCard(id, ok ? Rating.Good : Rating.Again));
    }
    showWord(id, queue.length);
  }

  function header(left: number | null) {
    return h('div', { class: 'row' }, h('b', {}, 'Daily review'),
      h('span', { class: 'small muted', style: 'margin-left:auto' }, `${done} done${left !== null ? ` · ${left} in queue` : ''}`));
  }

  function showQuestion(q: Question, drill: string, after: () => void, alsoRate?: (ok: boolean) => void) {
    mount(root, h('div', { class: 'stack' }, header(null),
      renderQuestion(q, {
        onAnswer: (ok, given) => { recordAnswer(q.itemId, drill, ok, given); alsoRate?.(ok); },
        onNext: after,
      })));
  }

  function showWord(id: string, left: number) {
    const lemma = id.slice(5);
    const word = UNITS.flatMap((u) => u.words).find((w) => w.lemma === lemma);
    if (!word) { rateCard(id, Rating.Good); return next(); }
    const reveal = () => {
      const intervals = previewIntervals(cardOf(id));
      const rate = (g: Grade) => {
        rateCard(id, g);
        recordAnswer(id, 'review', g >= Rating.Good, ['', 'again', 'hard', 'good', 'easy'][g]);
        done++;
        next();
      };
      const grades: Array<[Grade, string]> = [[Rating.Again, 'Again'], [Rating.Hard, 'Hard'], [Rating.Good, 'Good'], [Rating.Easy, 'Easy']];
      mount(answerSlot, h('div', { class: 'stack fade-in', style: 'width:100%;align-items:center' },
        h('div', { style: 'font-size:22px;font-weight:600' }, word.gloss),
        h('div', { class: 'small muted' }, `${LEXICON[word.lemma]?.f ?? '?'} times in the NT${word.note ? ' · ' + word.note : ''}`),
        h('div', { class: 'ratings' }, ...grades.map(([g, label], i) =>
          h('button', { class: 'btn', type: 'button', onclick: () => rate(g) }, h('span', {}, h('kbd', {}, String(i + 1)), ' ', label), h('small', {}, intervals[g])))),
        h('span', { class: 'tiny muted' }, 'Be honest: "Again" is how the schedule learns. Space = Good.')));
      setKeyHandler((e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= 4) rate(grades[n - 1][0]);
        if (e.key === ' ') { e.preventDefault(); rate(Rating.Good); }
      });
    };
    const answerSlot = h('div', { style: 'width:100%' },
      h('button', { class: 'btn primary big', type: 'button', style: 'width:100%', onclick: reveal }, 'Show meaning ', h('kbd', {}, 'space')));
    setKeyHandler((e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); } });
    mount(root, h('div', { class: 'stack' }, header(left),
      h('div', { class: 'qcard fade-in' },
        h('span', { class: 'tiny muted' }, 'What does it mean?'),
        h('div', { class: 'big' }, word.display ?? word.lemma),
        answerSlot)));
  }

  function finish() {
    setKeyHandler(null);
    mount(root, h('div', { class: 'panel stack fade-in' },
      h('h1', { class: 'serif', style: 'margin:0;font-size:30px' }, done ? 'Done for now' : 'Nothing due'),
      h('p', { class: 'muted', style: 'margin:0' }, done ? `${done} items reviewed.` : 'Your cards are not due yet. Come back on your next study day.'),
      h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/dashboard' }, 'Back to the dashboard'), h('a', { class: 'btn', href: '#/read' }, 'Read a verse'))));
  }

  next();
  return h('div', {}, appHeader(), h('main', { class: 'page wrap' }, root));
}
