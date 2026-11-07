/**
 * dashboard.ts: the student's home page.
 *
 *   - Today's session: review due, the current unit, a reading.
 *   - Practice quiz scores (best attempt each; scores only, no pass/fail).
 *   - This week: which days you studied, against the Tue/Thu/Sat rhythm.
 *   - Course map: all 24 units in four parts, with a score ring on each unit
 *     that has a practice-check score, and a diamond for each practice quiz.
 */
import { h } from '../lib/dom';
import { appHeader, scoreColor } from '../components/layout';
import { cardOf, currentUnit, isStarted, localDay, state } from '../lib/progress';
import { isDue, isNew } from '../lib/srs';
import { PARTS, QUIZZES, UNITS, type Quiz, type Unit } from '../content/units';
import { reviewDeck } from './review';

/** Cards due now among units the student has started. */
export function dueCount(): number {
  return reviewDeck().filter((id) => { const c = cardOf(id); return !isNew(c) && isDue(c); }).length;
}

function greeting(): string {
  const hr = new Date().getHours();
  return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
}

function unitNode(u: Unit, current: Unit): HTMLElement {
  const best = state.best.get(u.id)?.best;
  const isCur = u.id === current.id;
  const ring = best === undefined
    ? (isCur ? 'var(--navy)' : 'var(--line)')
    : `conic-gradient(${scoreColor(best)} 0 ${best}%, var(--line) ${best}% 100%)`;
  const scoreText = isCur ? 'You are here' : best === undefined ? (isStarted(u.id) ? 'started' : '') : `${best}%`;
  return h('a', { class: `node${isCur ? ' current' : ''}${u.drafted ? '' : ' soon'}`, href: `#/unit/${u.id}`, title: u.drafted ? u.title : `${u.title} (content coming)` },
    h('span', { class: 'ring', style: `background:${ring}` }, h('span', {}, String(u.n))),
    h('span', { class: 'ch' }, u.chapters),
    h('span', { class: 't' }, u.title.replace(/, continued$/, ' (cont.)')),
    h('span', { class: 's', style: `color:${isCur ? 'var(--navy)' : best === undefined ? 'var(--ink-2)' : scoreColor(best)}` }, scoreText || ' '));
}

function quizNode(q: Quiz): HTMLElement {
  const best = state.best.get(q.id)?.best;
  const fill = best === undefined ? '#fff' : best >= 85 ? 'var(--green-soft)' : 'var(--saffron-soft)';
  return h('a', { class: 'node', href: `#/quiz/${q.id}`, title: `${q.title} practice` },
    h('span', { class: 'diamond', style: `background:${fill}` }, h('span', {}, q.id === 'exam' ? 'Ex' : q.id.toUpperCase())),
    h('span', { class: 'ch' }, 'practice quiz'),
    h('span', { class: 't' }, q.title),
    h('span', { class: 's', style: `color:${best === undefined ? 'var(--ink-2)' : scoreColor(best)}` }, best === undefined ? ' ' : `${best}%`));
}

function weekStrip(): HTMLElement {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay()); // Sunday
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const plan = [2, 4, 6];
  return h('div', { style: 'display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;text-align:center' },
    days.map((d) => {
      const n = state.days.get(localDay(d)) ?? 0;
      const isToday = localDay(d) === localDay(today);
      const planned = plan.includes(d.getDay());
      const [bg, fg, border, mark] = n > 0 ? ['var(--green)', '#fff', '0', '✓']
        : isToday ? ['var(--saffron)', 'var(--navy)', '0', '•']
        : planned && d > today ? ['#fff', 'var(--ink-2)', '2px dashed #b7c3e0', '']
        : ['var(--bg)', 'var(--ink-2)', '0', ''];
      return h('div', { class: 'stack', style: 'align-items:center;gap:6px' },
        h('span', { class: 'tiny muted' }, d.toLocaleDateString(undefined, { weekday: 'short' })),
        h('span', { title: n ? `${n} answers` : '', style: `width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-weight:700;background:${bg};color:${fg};border:${border};box-sizing:border-box` }, mark));
    }));
}

export function dashboardView(): Node {
  const current = currentUnit();
  const due = dueCount();
  const name = (state.user?.name || state.user?.email.split('@')[0] || '').split(' ')[0];
  const quizBars = QUIZZES.map((q) => {
    const best = state.best.get(q.id)?.best;
    return h('div', { style: 'display:grid;grid-template-columns:90px 1fr 56px;align-items:center;gap:12px;font-size:15px' },
      h('a', { href: `#/quiz/${q.id}`, style: 'font-weight:600;color:var(--ink);text-decoration:none' }, q.title),
      h('span', { style: 'height:10px;border-radius:999px;background:var(--line-2);overflow:hidden' },
        h('span', { style: `display:block;height:100%;border-radius:999px;width:${best ?? 0}%;background:${scoreColor(best)}` })),
      h('span', { class: 'muted', style: 'text-align:right' }, best === undefined ? 'not yet' : `${best}%`));
  });
  const acc = state.week.seen ? Math.round((100 * state.week.correct) / state.week.seen) : null;

  return h('div', {},
    appHeader(),
    h('main', { class: 'page wrap stack fade-in', style: 'gap:28px' },
      h('div', { class: 'row', style: 'align-items:stretch;gap:24px' },
        h('section', { class: 'panel navy stack', style: 'flex:3 1 520px;gap:18px;position:relative;overflow:hidden;border-radius:20px;padding:32px' },
          h('div', {},
            h('p', { style: 'margin:0;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--saffron)' },
              `${new Date().toLocaleDateString(undefined, { weekday: 'long' })} · today's session`),
            h('h1', { class: 'serif', style: 'margin:8px 0 0;font-size:36px;color:#fff' }, `${greeting()}${name ? ', ' + name : ''}. Next up: ${current.title}.`)),
          h('div', { class: 'grid3', style: 'gap:12px' },
            ...[
              ['Review', due ? `${due} card${due === 1 ? '' : 's'} due` : 'Nothing due yet'],
              [`Unit ${current.n} · ${current.chapters}`, current.title],
              ['Read', 'A verse at your level'],
            ].map(([t, d]) => h('div', { style: 'background:rgba(255,255,255,.08);border-radius:12px;padding:14px' },
              h('b', { style: 'display:block' }, t), h('span', { class: 'small', style: 'color:var(--on-navy)' }, d)))),
          h('div', { class: 'row' },
            h('a', { class: 'btn saffron big', href: due ? '#/review' : `#/unit/${current.id}` }, due ? 'Start with review' : `Open unit ${current.n}`),
            h('a', { class: 'btn ghost-light big', href: `#/unit/${current.id}` }, `Go to unit ${current.n}`))),
        h('section', { class: 'panel stack', style: 'flex:2 1 300px;gap:14px' },
          h('h2', { class: 'serif', style: 'font-size:24px' }, 'Practice quiz scores'),
          ...quizBars,
          h('p', { class: 'small muted', style: 'margin:0' }, 'Best attempt at each practice quiz.',
            acc === null ? '' : ` Review accuracy this week: ${acc}%.`))),

      h('section', { class: 'panel stack', style: 'gap:14px' },
        h('div', { class: 'row', style: 'align-items:baseline' },
          h('h2', { class: 'serif', style: 'font-size:24px' }, 'This week'),
          h('span', { class: 'small muted' }, 'Green: days you studied. Dashed: your Tue/Thu/Sat plan.')),
        weekStrip()),

      h('section', { class: 'panel stack', style: 'gap:22px;padding:28px' },
        h('div', { class: 'row', style: 'align-items:baseline;gap:14px' },
          h('h2', { class: 'serif', style: 'font-size:30px' }, 'Course map'),
          h('span', { class: 'muted' }, 'Greek Fundamentals I · 24 units · chapters 1 to 21'),
          h('span', { class: 'row tiny muted', style: 'margin-left:auto;gap:16px' },
            legend('var(--green)', '85% or more'), legend('var(--orange)', 'below 85%'), legend('', 'no score yet', true))),
        ...[1, 2, 3, 4].map((p) => h('div', { class: 'map-part' },
          h('div', { class: 'label' },
            h('span', { style: 'font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--amber-ink)' }, `Part ${p}`),
            h('b', { class: 'serif', style: 'font-size:22px' }, PARTS[p].name),
            h('span', { class: 'small muted' }, PARTS[p].chapters)),
          h('div', { class: 'map-track' },
            h('div', { class: 'map-row' },
              ...UNITS.filter((u) => u.part === p).flatMap((u) => [
                unitNode(u, current),
                ...QUIZZES.filter((q) => q.afterUnit === u.n).map(quizNode),
              ]))))))));
}

function legend(color: string, text: string, outline = false): HTMLElement {
  return h('span', { class: 'row', style: 'gap:6px' },
    h('span', { style: `width:12px;height:12px;border-radius:50%;${outline ? 'border:2px solid #b7c3e0;box-sizing:border-box' : `background:${color}`}` }), text);
}
