/**
 * stats.ts: the Progress screen.
 *   - Totals: study sessions, answers, minutes.
 *   - Letter accuracy: every letter coloured by how often you get it right
 *     across all alphabet drills (red < 70%, amber < 90%, green >= 90%).
 *     This is the "which letters do I still trip on" view.
 *   - Recent sessions, grouped by day, so you can see whether the
 *     Tuesday / Thursday / Saturday rhythm is holding.
 */
import { h } from '../lib/dom';
import { getProgress, totalFor } from '../lib/store';
import { LETTERS } from '../modules/alphabet/data';
import { deckSummary } from '../modules/alphabet/cards';

export function statsView(): Node {
  const p = getProgress();
  const answers = p.sessions.reduce((n, s) => n + Object.values(s.counts).reduce((a, b) => a + b, 0), 0);
  const minutes = Math.round(p.sessions.reduce((n, s) => n + (new Date(s.end).getTime() - new Date(s.start).getTime()), 0) / 60000);
  const d = deckSummary();

  // Group sessions by local date, newest first.
  const byDay = new Map<string, { answers: number; minutes: number }>();
  for (const s of p.sessions) {
    const day = new Date(s.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const cur = byDay.get(day) ?? { answers: 0, minutes: 0 };
    cur.answers += Object.values(s.counts).reduce((a, b) => a + b, 0);
    cur.minutes += Math.max(1, Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000));
    byDay.set(day, cur);
  }
  const days = [...byDay.entries()].reverse().slice(0, 20);

  return h('div', {},
    h('h1', {}, 'Progress'),
    h('p', { class: 'lead' }, 'Across every device that syncs to your GitHub progress file.'),
    h('div', { class: 'stats-row' },
      h('div', { class: 'stat' }, h('b', {}, String(byDay.size)), h('span', {}, 'study days')),
      h('div', { class: 'stat' }, h('b', {}, String(answers)), h('span', {}, 'answers')),
      h('div', { class: 'stat' }, h('b', {}, `${minutes}`), h('span', {}, 'minutes in drills')),
      h('div', { class: 'stat' }, h('b', {}, `${d.learned}/${d.total}`), h('span', {}, 'alphabet cards learned')),
    ),

    h('h2', {}, 'Letter accuracy'),
    h('p', { class: 'muted small-text' }, 'All alphabet drills combined. Grey = not practised yet.'),
    h('div', { class: 'heat' },
      LETTERS.map((l) => {
        const t = totalFor(p, `alpha:${l.id}`);
        const pct = t.seen ? t.correct / t.seen : 0;
        const lvl = t.seen === 0 ? 0 : pct < 0.7 ? 1 : pct < 0.9 ? 2 : 3;
        return h('div', { class: `lvl${lvl}`, title: `${l.name}: ${t.correct} of ${t.seen}` },
          h('div', { class: 'g' }, l.lower),
          h('div', { class: 'p' }, t.seen ? `${Math.round(pct * 100)}% · ${t.seen}` : l.name));
      })),

    h('h2', {}, 'Recent study days'),
    days.length
      ? h('table', { class: 'list' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Day'), h('th', {}, 'Answers'), h('th', {}, 'Minutes'))),
          h('tbody', {}, days.map(([day, v]) => h('tr', {}, h('td', {}, day), h('td', {}, String(v.answers)), h('td', {}, String(v.minutes))))))
      : h('p', { class: 'muted' }, 'No sessions yet. Your first answer starts one.'),
  );
}
