/**
 * question.ts: show ONE question and report the answer.
 *
 * Shared by practice checks, practice quizzes and the daily review, so a
 * question looks and behaves the same everywhere:
 *   - multiple choice: tap an option or press 1 to 4;
 *   - parse: pick case, number and gender, then "Check" (or Enter);
 *   - after answering: right answer in green, a wrong pick in red (with a
 *     small shake), and the "why" sentence underneath. "Next" (or space /
 *     Enter) moves on. Right answers move on automatically after a moment.
 *
 * renderQuestion() returns the element; `onAnswer(correct, given)` fires once,
 * when the student answers; `onNext()` fires when they move on.
 */
import { h, mount } from '../lib/dom';
import { setKeyHandler } from '../router';
import { parseIsRight, parseLabel, type ParseAnswer, type Question } from '../content/questions';
import { state } from '../lib/progress';

const CASES = ['nominative', 'genitive', 'dative', 'accusative'];
const NUMBERS = ['singular', 'plural'];
const GENDERS = ['masculine', 'feminine', 'neuter'];
const ABBR: Record<string, string> = {
  nominative: 'nom.', genitive: 'gen.', dative: 'dat.', accusative: 'acc.',
  singular: 'sg.', plural: 'pl.', masculine: 'masc.', feminine: 'fem.', neuter: 'neut.',
};

export interface Handlers {
  onAnswer: (correct: boolean, given: string) => void;
  onNext: () => void;
  /** Label above the card, e.g. "Practice check · 3 of 12". */
  context?: string;
}

export function renderQuestion(q: Question, hd: Handlers): HTMLElement {
  const feedback = h('div', { 'aria-live': 'polite' });
  const nextBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => hd.onNext() }, 'Next');
  let done = false;

  function showResult(correct: boolean, why: string) {
    done = true;
    const misses = state.items.get(q.itemId)?.misses7 ?? 0;
    mount(feedback, h('div', { class: `feedback ${correct ? 'good' : 'bad'} fade-in` },
      correct ? h('b', {}, 'Right. ') : h('b', {}, 'Not quite. '), why,
      !correct && misses >= 2 ? h('div', { class: 'small muted', style: 'margin-top:6px' }, `Missed ${misses + 1} times this week; it will come back soon.`) : null,
      h('div', { class: 'row', style: 'margin-top:12px;justify-content:flex-end' }, nextBtn)));
    setKeyHandler((e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hd.onNext(); } });
    nextBtn.focus();
  }

  const header = h('span', { class: 'tiny muted' }, q.kind === 'parse' ? 'Parse it' : q.prompt);

  if (q.kind === 'parse') {
    const pick: Partial<ParseAnswer> = {};
    const allowedCases = CASES.filter((c) => q.cases.includes(c));
    const rows: Array<[keyof ParseAnswer, string[], string]> = [['case', allowedCases, 'Case'], ['number', NUMBERS, 'Number'], ['gender', GENDERS, 'Gender']];
    const buttons = new Map<string, HTMLButtonElement>();
    const check = h('button', { class: 'btn primary', type: 'button', disabled: true }, 'Check') as HTMLButtonElement;
    const chipRows = rows.map(([field, values, label]) => h('div', { class: 'chips', role: 'group', 'aria-label': label },
      h('span', { class: 'lbl' }, label),
      ...values.map((v) => {
        const b = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false' }, ABBR[v]) as HTMLButtonElement;
        buttons.set(`${field}:${v}`, b);
        b.addEventListener('click', () => {
          if (done) return;
          pick[field] = v as never;
          for (const other of values) {
            const ob = buttons.get(`${field}:${other}`)!;
            ob.classList.toggle('on', other === v);
            ob.setAttribute('aria-pressed', String(other === v));
          }
          check.disabled = !(pick.case && pick.number && pick.gender);
        });
        return b;
      })));
    const submit = () => {
      if (done || check.disabled) return;
      const answer = pick as ParseAnswer;
      const ok = parseIsRight(q, answer);
      // Colour every chip: green = part of a right answer, red = picked and wrong.
      const right = q.accepted[0];
      for (const [field] of rows) {
        const chosen = buttons.get(`${field}:${answer[field]}`)!;
        const valid = q.accepted.some((a) => a[field] === answer[field]);
        chosen.classList.add(valid ? 'right' : 'wrong');
        if (!valid) { chosen.classList.add('shake'); buttons.get(`${field}:${right[field]}`)?.classList.add('right'); }
      }
      check.remove();
      hd.onAnswer(ok, parseLabel(answer));
      showResult(ok, q.why);
      if (ok) setTimeout(() => { if (document.body.contains(nextBtn)) hd.onNext(); }, 1100);
    };
    check.addEventListener('click', submit);
    setKeyHandler((e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    return h('div', { class: 'stack fade-in' },
      hd.context ? h('span', { class: 'tiny muted' }, hd.context) : null,
      h('div', { class: 'qcard' }, header,
        h('div', { class: 'big' }, q.greek),
        h('span', { class: 'small muted' }, `from ${q.lemma}, "${q.gloss}"`),
        h('div', { class: 'stack', style: 'width:100%;gap:10px;margin-top:6px' }, ...chipRows),
        h('div', { class: 'row', style: 'justify-content:center' }, check)),
      feedback);
  }

  // Multiple choice (concept, meaning, cell, letter).
  const mc = q; // narrowed: not 'parse' past this point
  const greekOptions = q.kind === 'cell';
  const opts = q.options.map((o, i) => h('button', { class: 'opt', type: 'button', onclick: () => answer(i) },
    h('kbd', {}, String(i + 1)), greekOptions ? h('span', { class: 'greek' }, o) : o) as HTMLButtonElement);
  function answer(i: number) {
    if (done) return;
    const ok = i === mc.answer;
    opts[mc.answer].classList.add('right');
    if (!ok) { opts[i].classList.add('wrong', 'shake'); }
    hd.onAnswer(ok, mc.options[i]);
    showResult(ok, q.why);
    if (ok) setTimeout(() => { if (document.body.contains(nextBtn)) hd.onNext(); }, 900);
  }
  setKeyHandler((e) => { const n = Number(e.key); if (n >= 1 && n <= opts.length) answer(n - 1); });
  return h('div', { class: 'stack fade-in' },
    hd.context ? h('span', { class: 'tiny muted' }, hd.context) : null,
    h('div', { class: 'qcard' }, header,
      q.greek ? h('div', { class: q.greek.length > 14 ? 'mid' : 'big' }, q.greek) : null,
      h('div', { class: 'options' }, ...opts)),
    feedback);
}
