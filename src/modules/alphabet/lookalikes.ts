/**
 * lookalikes.ts: drill the classic traps.
 *
 * Part A, "false friends": a Greek letter that looks like a different
 * English letter (ν looks like v but is n). The prompt shows the Greek
 * letter; the choices are sounds, and one of them is always the English
 * letter your eye wants to read. Picking it is the mistake we are training out.
 *
 * Part B, "Greek twins": two Greek letters that look alike (ζ/ξ, ν/υ, ο/ω,
 * ε/η, θ/φ ...). The prompt names one, the choices are both glyphs plus
 * two others.
 *
 * A round is 16 questions, alternating A and B, over all 24 letters: these
 * traps matter from day one of reading, even before all batches are open.
 */
import { h, mount, shuffle } from '../../lib/dom';
import { mcRound, type Question } from '../../components/mcround';
import { CONFUSABLE_PAIRS, FALSE_FRIENDS, LETTERS, letterById } from './data';

const ROUND = 16;

function falseFriendQuestion(): Question {
  const ff = FALSE_FRIENDS[Math.floor(Math.random() * FALSE_FRIENDS.length)];
  const l = letterById(ff.letterId);
  // Correct sound, the English trap, and two other transliterations.
  const others = shuffle(LETTERS.filter((x) => x.translit !== l.translit && x.translit !== ff.looksLike.toLowerCase()))
    .slice(0, 2).map((x) => x.translit);
  const options = shuffle([l.translit, ff.looksLike.toLowerCase(), ...others]);
  return {
    itemId: `alpha:${l.id}`,
    ask: 'This is Greek. What sound does it make?',
    prompt: h('div', { class: 'glyph' }, ff.greek),
    choices: options.map((o) => ({ label: o, correct: o === l.translit })),
    explain: `${ff.greek} looks like an English "${ff.looksLike}", but it is ${l.name}: ${l.sound}.`,
    missedLabel: ff.greek,
  };
}

function twinQuestion(): Question {
  const [a, b] = CONFUSABLE_PAIRS[Math.floor(Math.random() * CONFUSABLE_PAIRS.length)];
  const [target, twin] = shuffle([letterById(a), letterById(b)]);
  const fillers = shuffle(LETTERS.filter((x) => x !== target && x !== twin)).slice(0, 2);
  const options = shuffle([target, twin, ...fillers]);
  return {
    itemId: `alpha:${target.id}`,
    ask: `Which one is ${target.name}?`,
    prompt: h('div', { class: 'name' }, target.name),
    choices: options.map((o) => ({ label: h('span', { class: 'greek' }, o.lower), correct: o === target })),
    explain: `${target.lower} is ${target.name}; ${twin.lower} is ${twin.name}. ${target.note ?? ''}`.trim(),
    missedLabel: target.lower,
  };
}

export function lookalikesView(): Node {
  const root = h('div', {});
  function start(): void {
    const questions = Array.from({ length: ROUND }, (_, i) => (i % 2 === 0 ? falseFriendQuestion() : twinQuestion()));
    mount(root, h('div', {},
      h('p', { class: 'lead', style: 'text-align:center;margin:0 auto 16px' },
        'Trust the Greek, not your English eye.'),
      mcRound({ title: 'Look-alikes', drillId: 'lookalikes', questions, onAgain: start, backHref: '#/alphabet' })));
  }
  start();
  return root;
}
