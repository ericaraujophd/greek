/**
 * check.ts: practice checks (#/check/u06) and practice quizzes (#/quiz/q2).
 *
 * Same flow for both: one question at a time, then a results screen with
 * the score, your best score, and every miss with the reason. Scores only,
 * no pass/fail. Each attempt is saved; each answer also feeds the review
 * (missed forms and words come back sooner).
 */
import { h, mount } from '../lib/dom';
import { appHeader } from '../components/layout';
import { renderQuestion } from '../components/question';
import { recordAnswer, saveScore, state } from '../lib/progress';
import { practiceQuiz, unitCheck, type Question } from '../content/questions';
import { QUIZZES, unitById } from '../content/units';
import { setKeyHandler } from '../router';

export function checkView(params: { id?: string }): Node {
  return runner('check', params.id ?? '');
}
export function quizView(params: { id?: string }): Node {
  return runner('quiz', params.id ?? '');
}

function runner(kind: 'check' | 'quiz', id: string): Node {
  const quiz = QUIZZES.find((q) => q.id === id);
  let title: string, back: string;
  try {
    title = kind === 'check' ? `Practice check · Unit ${unitById(id).n}: ${unitById(id).title}` : `${quiz!.title} practice`;
    back = kind === 'check' ? `#/unit/${id}` : '#/dashboard';
  } catch { return h('div', {}, appHeader(), h('main', { class: 'page wrap' }, h('p', {}, 'Not found.'))); }

  const root = h('div', { class: 'drill' });
  const drill = kind === 'check' ? `check:${id}` : `quiz:${id}`;

  function start() {
    const questions: Question[] = kind === 'check' ? unitCheck(id) : practiceQuiz(id);
    if (!questions.length) {
      mount(root, h('div', { class: 'panel' }, h('p', {}, 'This practice quiz becomes available once its units have content.'), h('a', { class: 'btn', href: back }, 'Back')));
      return;
    }
    const results: Array<{ itemId: string; correct: boolean; given: string; why: string; shown: string }> = [];
    let i = 0;
    const show = () => {
      if (i >= questions.length) return finish(questions, results);
      const q = questions[i];
      mount(root, h('div', { class: 'stack' },
        h('div', { class: 'row' }, h('b', {}, title), h('span', { class: 'small muted', style: 'margin-left:auto' }, `${i + 1} of ${questions.length}`)),
        h('div', { class: 'bar' }, h('div', { style: `width:${(i / questions.length) * 100}%` })),
        renderQuestion(q, {
          onAnswer: (correct, given) => {
            recordAnswer(q.itemId, drill, correct, given);
            results.push({ itemId: q.itemId, correct, given, why: q.why, shown: q.greek ?? q.prompt });
          },
          onNext: () => { i++; show(); },
        })));
    };
    show();
  }

  function finish(questions: Question[], results: Array<{ itemId: string; correct: boolean; given: string; why: string; shown: string }>) {
    setKeyHandler(null);
    const right = results.filter((r) => r.correct).length;
    const pct = Math.round((100 * right) / questions.length);
    const prevBest = state.best.get(id)?.best;
    const missed = results.filter((r) => !r.correct);
    void saveScore(id, right, questions.length, { missed: missed.map(({ itemId, given, why, shown }) => ({ itemId, given, why, shown })) });
    mount(root, h('div', { class: 'stack fade-in', style: 'gap:18px' },
      h('div', { class: 'row', style: 'align-items:stretch;gap:18px' },
        h('div', { class: 'panel navy stack', style: 'flex:1 1 220px;gap:6px' },
          h('span', { class: 'tiny', style: 'letter-spacing:.08em;text-transform:uppercase;color:var(--on-navy)' }, title),
          h('b', { class: 'serif', style: 'font-size:52px;line-height:1.1' }, `${pct}%`),
          h('span', { style: 'color:var(--on-navy)' }, `${right} of ${questions.length}`,
            prevBest !== undefined ? ` · best before: ${prevBest}%` : ''))),
      missed.length
        ? h('section', { class: 'panel stack', style: 'gap:10px' },
            h('h2', { class: 'serif', style: 'font-size:24px' }, 'What you missed, and why'),
            ...missed.map((m) => h('div', { style: 'border-bottom:1px solid var(--line-2);padding-bottom:10px' },
              h('div', { class: 'row', style: 'align-items:baseline' },
                h('span', { class: 'greek', style: 'font-size:22px;min-width:120px' }, m.shown),
                h('span', { class: 'small muted' }, `you answered: ${m.given}`)),
              h('div', {}, m.why))))
        : h('div', { class: 'feedback good' }, h('b', {}, 'Nothing missed. ')),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Take it again'),
        missed.length ? h('a', { class: 'btn', href: '#/review' }, 'Review') : null,
        h('a', { class: 'btn', href: back }, kind === 'check' ? 'Back to the unit' : 'Back to the dashboard'))));
  }

  start();
  return h('div', {}, appHeader(), h('main', { class: 'page wrap' }, root));
}
