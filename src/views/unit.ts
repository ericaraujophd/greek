/**
 * unit.ts: one unit's page (#/unit/u06).
 *
 * Sections, top to bottom: key ideas, paradigms, words, my notes. A side
 * panel holds the "before this page" checklist, the practice check score
 * (best attempt, retake any time), links, and the next unit.
 *
 * DRAFT CONTENT
 *   Content is drafted by Claude and checked by Eric. Students see a part
 *   (ideas / words / check) only once it is marked checked. Admins always
 *   see everything, with a yellow banner and buttons to mark parts checked
 *   right here, while reading against the book.
 *
 * Opening a unit marks it "started": its words and paradigm cells then join
 * the daily review.
 */
import { h } from '../lib/dom';
import { appHeader, listenButton } from '../components/layout';
import { api } from '../lib/api';
import { contentVisible, isAdmin, markStarted, saveNote, setChecklist, state } from '../lib/progress';
import { lessonFor } from '../content/lessons';
import { LEXICON } from '../content/questions';
import { PARTS, UNITS, unitById, type Unit } from '../content/units';
import type { Lesson, Paradigm } from '../content/types';

export function unitView(params: { id?: string }): Node {
  let unit: Unit;
  try { unit = unitById(params.id ?? ''); } catch { return h('div', {}, appHeader(), h('main', { class: 'page wrap' }, h('p', {}, 'No such unit.'))); }
  const lesson = lessonFor(unit.id);
  void markStarted(unit.id);

  const next = UNITS.find((u) => u.n === unit.n + 1);
  const best = state.best.get(unit.id);
  const watermark = lesson?.paradigms[0]?.rows[1]?.cells[0] ?? unit.words[0]?.lemma ?? 'α β γ';

  return h('div', {},
    appHeader(),
    h('section', { class: 'unit-hero' },
      h('span', { class: 'watermark', 'aria-hidden': 'true' }, watermark),
      h('div', { class: 'wrap stack', style: 'position:relative;padding-top:36px;padding-bottom:32px;gap:10px' },
        h('a', { href: '#/dashboard', style: 'color:var(--saffron);font-size:14px;text-decoration:none' },
          `Course map / Part ${unit.part}, ${PARTS[unit.part].name} / Unit ${unit.n}`),
        h('h1', {}, unit.title),
        h('p', { style: 'margin:0;max-width:40em;color:var(--on-navy);font-size:18px' }, `Mounce ${unit.chapters}. ${unit.goal}`),
        h('div', { class: 'row', style: 'gap:10px;margin-top:6px' },
          h('span', { class: 'pill on-navy' }, `Class session: ${unit.session}`),
          best ? h('span', { class: 'pill on-navy' }, `Practice check: ${best.best}%`) : null,
          unit.insight ? h('span', { class: 'pill on-navy' }, `It's all Greek to me: ${unit.insight}`) : null))),

    lesson
      ? h('nav', { class: 'tabs', 'aria-label': 'Unit sections' },
          h('div', { class: 'wrap row', style: 'gap:4px' },
            ...[['ideas', 'Key ideas'], ['paradigms', 'Paradigms'], ['words', 'Words'], ['notes', 'My notes']]
              .filter(([id]) => id !== 'paradigms' || lesson.paradigms.length)
              .filter(([id]) => id !== 'words' || unit.words.length)
              .map(([id, label]) => h('a', { href: `#/unit/${unit.id}`, onclick: (e: Event) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); } }, label))))
      : null,

    h('main', { class: 'page wrap', style: 'display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start' },
      h('div', { class: 'stack', style: 'flex:999 1 620px;min-width:0;gap:28px' },
        lesson ? content(unit, lesson) : h('div', { class: 'panel' },
          h('h2', { class: 'serif', style: 'font-size:26px' }, 'Content for this unit is coming'),
          h('p', { class: 'muted' }, 'Units are prepared in batches ahead of the class schedule. Read the chapter in Mounce; your notes below are saved now.')),
        notesSection(unit)),
      side(unit, lesson, next)));
}

/* ------------------------------ main column ------------------------------ */

function content(unit: Unit, lesson: Lesson): Node {
  const parts: Node[] = [];
  const draftNote = (part: 'ideas' | 'words' | 'check', label: string) => {
    if (!isAdmin() || state.status.get(`${unit.id}:${part}`) === 'checked') return null;
    const btn = h('button', { class: 'btn small', type: 'button' }, `Mark ${label} checked`);
    btn.addEventListener('click', async () => {
      await api('PUT', '/api/admin/content-status', { unit_id: unit.id, part, status: 'checked' });
      state.status.set(`${unit.id}:${part}`, 'checked');
      btn.replaceWith(h('span', { class: 'pill good' }, 'Checked'));
    });
    return h('div', { class: 'draft-banner row' },
      h('span', { style: 'flex:1 1 300px' }, h('b', {}, 'Draft. '), `Check the ${label} against Mounce ${unit.chapters}. Students don't see this until it is marked checked.`), btn);
  };

  if (contentVisible(unit.id, 'ideas')) {
    parts.push(h('section', { id: 'ideas', class: 'stack' },
      h('h2', { class: 'serif', style: 'font-size:30px;margin:0' }, 'Key ideas'),
      draftNote('ideas', 'key ideas and paradigms'),
      lesson.ideas.cards.length ? h('div', { class: 'grid2' }, ...lesson.ideas.cards.map((c) =>
        h('div', { class: 'idea-card' },
          h('span', { style: 'font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--amber-ink)' }, c.label),
          h('p', { style: 'margin:6px 0 0' }, c.text),
          c.greek ? h('p', { class: 'eg' }, c.greek) : null,
          c.english ? h('p', { class: 'small muted', style: 'margin:0' }, c.english) : null))) : null,
      h('ul', { class: 'stack', style: 'margin:0;padding-left:20px;gap:6px' }, ...lesson.ideas.points.map((p) => h('li', {}, p))),
      lesson.ideas.watch ? h('div', { class: 'watch' }, h('b', {}, 'Watch for: '), lesson.ideas.watch) : null));

    if (lesson.paradigms.length) {
      parts.push(h('section', { id: 'paradigms', class: 'panel stack' },
        h('h2', { class: 'serif', style: 'font-size:30px' }, 'Paradigms'),
        ...lesson.paradigms.map(paradigmTable)));
    }
  } else {
    parts.push(h('div', { class: 'panel' }, h('p', { class: 'muted', style: 'margin:0' }, 'The key ideas for this unit are being checked and will appear here soon.')));
  }

  if (unit.words.length && contentVisible(unit.id, 'words')) {
    parts.push(h('section', { id: 'words', class: 'stack' },
      h('div', { class: 'row', style: 'align-items:baseline' },
        h('h2', { class: 'serif', style: 'font-size:30px;margin:0' }, 'Words'),
        h('span', { class: 'muted small' }, `${unit.words.length} words · each joins your review`)),
      draftNote('words', 'word list'),
      h('div', { class: 'grid2', style: 'gap:10px' }, ...unit.words.map((w) =>
        h('div', { class: 'word-row' },
          h('span', { class: 'g' }, w.display ?? w.lemma),
          h('span', { class: 'm' }, h('span', {}, w.gloss),
            h('span', { class: 'tiny muted' }, `${LEXICON[w.lemma]?.f ?? '?'} times in the NT${w.note ? ' · ' + w.note : ''}`)),
          listenButton(w.lemma))))));
  }

  if (lesson.links?.length) {
    parts.push(h('section', { class: 'grid2' }, ...lesson.links.map((l) =>
      h('a', { class: 'panel', href: l.href, style: 'text-decoration:none;color:var(--ink)' },
        h('b', { style: 'display:block;font-size:18px' }, l.label, ' →'), h('span', { class: 'muted small' }, l.text)))));
  }
  return h('div', { class: 'stack', style: 'gap:28px' }, ...parts);
}

function paradigmTable(p: Paradigm): Node {
  const table = h('table', { class: 'paradigm' },
    h('thead', {}, h('tr', {}, h('th', {}), ...p.columns.map((c) => h('th', {}, c)))),
    h('tbody', {}, ...p.rows.map((r) => h('tr', { class: r.isNew ? 'new' : '' }, h('td', {}, r.label), ...r.cells.map((c) => h('td', {}, c))))));
  const toggle = h('button', { class: 'btn small', type: 'button' }, 'Hide forms');
  toggle.addEventListener('click', () => {
    const masked = table.classList.toggle('masked');
    toggle.textContent = masked ? 'Show forms' : 'Hide forms';
  });
  return h('div', { class: 'stack', style: 'gap:10px' },
    h('div', { class: 'row' }, h('h3', { style: 'margin:0;font-size:17px' }, p.title), h('span', { style: 'margin-left:auto' }, toggle)),
    h('div', { class: 'scroll-x' }, table),
    p.note ? h('p', { class: 'small muted', style: 'margin:0' }, p.note) : null);
}

function notesSection(unit: Unit): Node {
  const area = h('textarea', { class: 'notes', id: 'mynotes', 'aria-describedby': 'notes-help' }) as HTMLTextAreaElement;
  area.value = state.notes.get(unit.id) ?? '';
  const status = h('span', { class: 'tiny muted', role: 'status' }, '');
  let t: number | undefined;
  area.addEventListener('input', () => {
    status.textContent = 'Saving…';
    clearTimeout(t);
    t = window.setTimeout(async () => {
      try { await saveNote(unit.id, area.value); status.textContent = 'Saved'; } catch { status.textContent = 'Not saved: offline?'; }
    }, 800);
  });
  return h('section', { id: 'notes', class: 'panel stack', style: 'gap:10px' },
    h('div', { class: 'row', style: 'align-items:baseline' }, h('h2', { class: 'serif', style: 'font-size:30px' }, 'My notes'), status),
    h('label', { for: 'mynotes', id: 'notes-help', class: 'small muted' }, 'Explain the chapter in your own words. Saved automatically.'),
    area);
}

/* ------------------------------ side panel ------------------------------ */

function side(unit: Unit, lesson: Lesson | undefined, next: Unit | undefined): Node {
  const items = lesson?.before ?? [`Read Mounce ${unit.chapters}`, 'Workbook exercises'];
  const checks: Record<string, boolean> = { ...(state.checklists.get(unit.id) ?? {}) };
  const list = h('div', { class: 'stack', style: 'gap:6px' }, ...items.map((text, i) => {
    const key = `b${i}`;
    const box = h('input', { type: 'checkbox', id: `chk-${key}`, style: 'width:20px;height:20px' }) as HTMLInputElement;
    box.checked = Boolean(checks[key]);
    box.addEventListener('change', () => { checks[key] = box.checked; void setChecklist(unit.id, checks); });
    return h('label', { for: `chk-${key}`, style: 'display:flex;gap:10px;align-items:flex-start;min-height:32px' }, box, h('span', {}, text));
  }));

  const best = state.best.get(unit.id);
  const canCheck = lesson && contentVisible(unit.id, 'check');
  const checkBox = h('div', { class: 'panel navy stack', style: 'gap:10px;border-radius:20px' },
    h('h3', { style: 'margin:0;font-size:15px' }, 'Practice check'),
    best
      ? h('div', { class: 'row', style: 'align-items:baseline;gap:10px' },
          h('b', { class: 'serif', style: `font-size:44px;line-height:1;color:${best.best >= 85 ? '#7fe0b6' : 'var(--saffron)'}` }, `${best.best}%`),
          h('span', { class: 'small', style: 'color:var(--on-navy)' }, `best of ${best.attempts} ${best.attempts === 1 ? 'try' : 'tries'}`))
      : h('p', { class: 'small', style: 'margin:0;color:var(--on-navy)' }, 'Not taken yet.'),
    h('p', { class: 'small', style: 'margin:0;color:var(--on-navy)' }, 'Up to 12 questions on this unit. Take it as often as you like; your best score is kept.'),
    canCheck
      ? h('a', { class: 'btn saffron', href: `#/check/${unit.id}` }, best ? 'Take it again' : 'Take the check')
      : h('span', { class: 'small', style: 'color:var(--on-navy-2)' }, 'Available once the unit content is ready.'));

  return h('aside', { class: 'stack', style: 'flex:1 1 280px;gap:16px' },
    h('div', { class: 'panel stack', style: 'gap:10px' }, h('h3', { style: 'margin:0;font-size:15px' }, 'Before this page'), list),
    checkBox,
    next ? h('a', { class: 'panel row', href: `#/unit/${next.id}`, style: 'text-decoration:none;color:var(--ink);font-weight:600;padding:16px 18px' },
      h('span', { style: 'flex:1' }, `Next: Unit ${next.n}, ${next.chapters}`), h('span', { 'aria-hidden': 'true' }, '→')) : null);
}
