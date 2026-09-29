/**
 * mcround.ts: a reusable multiple-choice round, used by the speed drill and
 * the look-alikes drill (and later by vocabulary and parsing drills).
 *
 * A round is a list of questions. Each question shows a prompt and 2 to 4
 * choices. The learner answers with a click/tap or the keys 1 to 4.
 *   - right answer: short green flash, next question after 0.6 s
 *   - wrong answer: the right choice turns green, the wrong one red, and a
 *     one-line explanation appears; the learner presses any key or taps
 *     "Next" to continue (so the correction is actually read)
 * Every answer is recorded with recordAnswer(itemId, correct, drillId),
 * which feeds the accuracy stats and the "weakest letters first" logic.
 * At the end a summary screen shows score, average time and the items missed.
 */
import { h, mount } from '../lib/dom';
import { recordAnswer } from '../lib/store';
import { setKeyHandler } from '../router';

export interface Choice {
  /** What the button shows (text or an element, e.g. a Greek glyph). */
  label: Node | string;
  correct: boolean;
}

export interface Question {
  /** The id stats are recorded under, e.g. "alpha:nu". */
  itemId: string;
  /** Small instruction above the prompt ("Which letter is this?"). */
  ask: string;
  /** The big thing in the middle. */
  prompt: Node;
  choices: Choice[];
  /** Shown after a wrong answer: the fact to remember. */
  explain: string;
  /** How to show this item in the "missed" list at the end. */
  missedLabel: string;
}

export interface RoundOptions {
  title: string;
  drillId: string;
  questions: Question[];
  /** Called when the learner taps "Another round". */
  onAgain: () => void;
  /** Where the "Done" button goes. */
  backHref: string;
}

export function mcRound(opts: RoundOptions): HTMLElement {
  const root = h('div', { class: 'drill' });
  let index = 0;
  let correctCount = 0;
  let totalMs = 0;
  const missed: string[] = [];

  function showQuestion(): void {
    const q = opts.questions[index];
    const started = performance.now();
    let answered = false;
    const feedback = h('div', { class: 'feedback' });
    const buttons = q.choices.map((choice, i) =>
      h('button', { onclick: () => answer(i) }, h('kbd', {}, String(i + 1)), choice.label));

    function answer(i: number): void {
      if (answered) return;
      answered = true;
      const elapsed = performance.now() - started;
      totalMs += elapsed;
      const ok = q.choices[i].correct;
      recordAnswer(q.itemId, ok, opts.drillId);
      buttons.forEach((b, j) => {
        if (q.choices[j].correct) b.classList.add('right');
        else if (j === i) b.classList.add('wrong');
      });
      if (ok) {
        correctCount++;
        feedback.className = 'feedback good';
        feedback.textContent = 'Right.';
        setTimeout(next, 600);
      } else {
        if (!missed.includes(q.missedLabel)) missed.push(q.missedLabel);
        feedback.className = 'feedback bad';
        mount(feedback, h('div', {}, h('div', {}, q.explain),
          h('button', { class: 'small', style: 'margin-top:8px', onclick: next }, 'Next ', h('kbd', {}, 'space'))));
        setKeyHandler((e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next(); } });
      }
    }

    setKeyHandler((e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= q.choices.length) answer(n - 1);
    });

    mount(root, h('div', {},
      h('div', { class: 'drill-top' },
        h('span', {}, opts.title),
        h('span', {}, `${index + 1} / ${opts.questions.length}`)),
      h('div', { class: 'progressbar' }, h('div', { style: `width:${(index / opts.questions.length) * 100}%` })),
      h('div', { class: 'prompt' }, h('div', { class: 'q' }, q.ask), q.prompt),
      h('div', { class: 'choices' }, buttons),
      feedback,
    ));
  }

  function next(): void {
    index++;
    if (index < opts.questions.length) showQuestion();
    else showSummary();
  }

  function showSummary(): void {
    const n = opts.questions.length;
    const pct = Math.round((correctCount / n) * 100);
    const avg = (totalMs / n / 1000).toFixed(1);
    setKeyHandler((e) => { if (e.key === 'Enter') opts.onAgain(); });
    mount(root, h('div', { class: 'prompt' },
      h('div', { class: 'q' }, opts.title + ': round complete'),
      h('div', { class: 'name' }, `${correctCount} / ${n}`),
      h('div', { class: 'muted' }, `${pct}% correct · ${avg} s per answer`),
      missed.length
        ? h('div', {}, h('div', { class: 'q', style: 'margin-top:10px' }, 'Missed this round'),
            h('div', { class: 'missed' }, missed.map((m) => h('span', {}, m))))
        : h('div', { class: 'muted' }, 'Nothing missed.'),
      h('div', { class: 'row', style: 'justify-content:center' },
        h('button', { class: 'primary', onclick: opts.onAgain }, 'Another round ', h('kbd', {}, 'enter')),
        h('a', { class: 'button', href: opts.backHref }, 'Done')),
    ));
  }

  showQuestion();
  return root;
}
