/**
 * speed.ts: 20-question multiple-choice rounds on the letters you have met.
 *
 * Two question types, mixed at random:
 *   glyph -> name   "Which letter is this?"   (shows λ, choices: lambda ...)
 *   name  -> glyph  "Which one is lambda?"    (choices: λ ν ...)
 * Capitals appear in about one question in four.
 *
 * SMARTER THAN RANDOM
 *   - Letter choice is weighted by your error rate (from all drills), so
 *     the letters you miss come up more. A letter you have never seen gets
 *     a high weight too, so it is not ignored.
 *   - Wrong choices are drawn first from the letter's known confusables
 *     (ν/υ, ζ/ξ, ε/η, ο/ω ...), which trains the distinctions that
 *     actually cause mistakes in reading.
 */
import { h, mount, shuffle, weightedPick } from '../../lib/dom';
import { getProgress, totalFor } from '../../lib/store';
import { mcRound, type Question } from '../../components/mcround';
import { LETTERS, confusablesOf, letterById, type Letter } from './data';
import { metLetters } from './cards';

const ROUND = 20;

/** Error-based weight: 1 (always right) up to 4 (always wrong or unseen). */
function weightOf(l: Letter): number {
  const t = totalFor(getProgress(), `alpha:${l.id}`);
  if (t.seen < 3) return 3;
  return 1 + 3 * (1 - t.correct / t.seen);
}

/** Three wrong answers: confusables first, then random letters from the pool. */
function distractors(target: Letter, pool: Letter[]): Letter[] {
  const tricky = confusablesOf(target.id).map(letterById);
  const rest = shuffle(pool.length >= 4 ? pool : LETTERS).filter((l) => l.id !== target.id && !tricky.includes(l));
  return [...shuffle(tricky), ...rest].slice(0, 3);
}

export function buildSpeedQuestions(pool: Letter[]): Question[] {
  const questions: Question[] = [];
  let last = '';
  while (questions.length < ROUND) {
    const l = weightedPick(pool, weightOf);
    if (l.id === last && pool.length > 1) continue; // no immediate repeats
    last = l.id;
    const capital = Math.random() < 0.25;
    const glyph = (x: Letter) => (capital ? x.upper : x.lower);
    const options = shuffle([l, ...distractors(l, pool)]);
    const explain = `${glyph(l)} is ${l.name} (${l.translit}), ${l.sound}.`;

    if (Math.random() < 0.5) {
      questions.push({
        itemId: `alpha:${l.id}`, ask: 'Which letter is this?', explain, missedLabel: l.lower,
        prompt: h('div', { class: 'glyph' }, glyph(l)),
        choices: options.map((o) => ({ label: o.name, correct: o.id === l.id })),
      });
    } else {
      questions.push({
        itemId: `alpha:${l.id}`, ask: `Which one is ${capital ? 'capital ' : ''}${l.name}?`, explain, missedLabel: l.lower,
        prompt: h('div', { class: 'name' }, l.name),
        choices: options.map((o) => ({ label: h('span', { class: 'greek' }, glyph(o)), correct: o.id === l.id })),
      });
    }
  }
  return questions;
}

export function speedView(): Node {
  const root = h('div', {});
  let useAll = false;

  function start(): void {
    const pool = useAll ? LETTERS : metLetters();
    mount(root, h('div', {},
      h('div', { class: 'row', style: 'justify-content:center;margin-bottom:14px' },
        h('span', { class: 'muted small-text' }, useAll ? 'All 24 letters' : `Letters met so far (${pool.length})`),
        h('button', { class: 'small', onclick: () => { useAll = !useAll; start(); } }, useAll ? 'Only letters met' : 'Use all 24')),
      mcRound({ title: 'Speed drill', drillId: 'speed', questions: buildSpeedQuestions(pool), onAgain: start, backHref: '#/alphabet' }),
    ));
  }

  start();
  return root;
}
