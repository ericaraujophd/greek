/**
 * unit.ts: one unit's page (#/unit/u06).
 *
 * THE FLOW (approved mockup "Unit flow", Nov 6 2026)
 *   A unit is a list of steps, in the order you should do them. The book is
 *   the compass, so reading Mounce always comes first:
 *
 *     1. Read Mounce (the section for this unit)
 *     2. Watch the chapter overview          (when the unit has one)
 *     3. Key ideas
 *     4. Paradigms                           (when the unit has tables)
 *     5. Words                               (when the unit has words)
 *     6. Workbook and other tasks, on paper  (from the lesson's "before" list)
 *     7. Practice check
 *
 *   Each step ends with a button to say you have done it ("I've read it").
 *   A done step turns green with the date and can be undone. The first step
 *   not yet done is "Now" and is open. The order is a guide, not a lock: you
 *   can open any step, and later steps are only dimmed.
 *   The practice check counts as done once it has a score.
 *
 *   Done dates are stored in the unit's checklist (unit_progress table) under
 *   keys "step:<id>", e.g. "step:read": "2026-11-03T14:05:00.000Z".
 *
 * NOTES
 *   The notes panel (components/notesPanel.ts) sits beside the steps, with
 *   the Greek keyboard. It starts a heading for the current step when you
 *   begin writing.
 *
 * DRAFT CONTENT
 *   Content is drafted by Claude and checked by Eric. Students see a part
 *   (ideas / words / check) only once it is marked checked. Admins always
 *   see everything, with a yellow banner and a button to mark it checked.
 *
 * Opening a unit marks it "started": its words and paradigm cells then join
 * the daily review.
 */
import { h } from '../lib/dom';
import { appHeader } from '../components/layout';
import { audioButton } from '../components/audioButton';
import { notesPanel } from '../components/notesPanel';
import { api } from '../lib/api';
import { contentVisible, isAdmin, markStarted, setChecklist, state } from '../lib/progress';
import { lessonFor } from '../content/lessons';
import { LEXICON } from '../content/questions';
import { PARTS, UNITS, unitById, type Unit } from '../content/units';
import type { Lesson, Paradigm } from '../content/types';
import { extraListening, overviewLinks, screencastLinks, type VideoLink } from '../content/videos';

/** One step of a unit. */
interface Step {
  id: string;
  title: string;
  /** One line under the title. */
  sub: string;
  /** What "done" is called on the button and in the date line. */
  doneLabel: string;
  doneVerb: string;
  /** The step's content when open. */
  body: () => Node | null;
}

export function unitView(params: { id?: string }): Node {
  let unit: Unit;
  try { unit = unitById(params.id ?? ''); } catch { return h('div', {}, appHeader(), h('main', { class: 'page wrap' }, h('p', {}, 'No such unit.'))); }
  const lesson = lessonFor(unit.id);
  void markStarted(unit.id);

  const steps = buildSteps(unit, lesson);
  const notes = notesPanel(unit.id, `Unit ${unit.n}`);
  const next = UNITS.find((u) => u.n === unit.n + 1);

  // The list of steps and the progress bar are redrawn whenever a step changes.
  const list = h('div', { class: 'steps' });
  const bar = h('div', { class: 'step-bar', 'aria-hidden': 'true' });
  const open = new Set<string>(); // steps opened by hand (besides "Now")

  const checklist = () => ({ ...(state.checklists.get(unit.id) ?? {}) });
  const doneAt = (s: Step): string | null => {
    if (s.id === 'check') {
      const best = state.best.get(unit.id);
      return best ? (state.latest.get(unit.id)?.taken_at ?? 'done') : null;
    }
    const v = checklist()[`step:${s.id}`];
    return typeof v === 'string' ? v : null;
  };
  const setDone = (s: Step, done: boolean) => {
    const c = checklist();
    if (done) c[`step:${s.id}`] = new Date().toISOString(); else delete c[`step:${s.id}`];
    void setChecklist(unit.id, c);
    open.delete(s.id);
    draw();
    if (done) list.querySelector('.step.current')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function draw() {
    const nowIndex = steps.findIndex((s) => !doneAt(s));
    const current = steps[nowIndex];
    notes.setStep(current ? `${nowIndex + 1} · ${current.title}` : 'Review');

    bar.replaceChildren(...steps.map((s, i) => h('i', { class: doneAt(s) ? 'on' : i === nowIndex ? 'cur' : '' })));
    list.replaceChildren(...steps.map((s, i) => stepCard(s, i, i === nowIndex, nowIndex)),
      nowIndex === -1 ? h('div', { class: 'feedback good' }, h('b', {}, 'Unit done. '), 'Keep it fresh in the daily review.') : '',
      next ? h('a', { class: 'panel row next-unit', href: `#/unit/${next.id}` },
        h('span', { style: 'flex:1' }, `Next: Unit ${next.n}, ${next.title} (${next.chapters})`), h('span', { 'aria-hidden': 'true' }, '→')) : '');
  }

  function stepCard(s: Step, i: number, isNow: boolean, nowIndex: number): Node {
    const when = doneAt(s);
    const expanded = isNow || open.has(s.id);
    const later = !when && !isNow && nowIndex !== -1 && i > nowIndex;
    const num = h('span', { class: `num${when ? ' done' : isNow ? ' cur' : ''}` }, when ? '✓' : String(i + 1));
    const toggle = () => { if (open.has(s.id)) open.delete(s.id); else open.add(s.id); draw(); };

    const headRight = when
      ? h('span', { class: 'when' }, s.id === 'check' ? `Best score ${state.best.get(unit.id)!.best}%` : `${s.doneVerb} ${dateLabel(when)}`)
      : isNow ? h('span', { class: 'pill now' }, 'Now') : h('span', { class: 'tiny muted' }, later ? `after step ${i}` : '');

    const head = h('button', { type: 'button', class: 'step-head', 'aria-expanded': String(expanded), onclick: isNow ? undefined : toggle },
      num, h('span', { class: 'st' }, h('b', {}, s.title), h('span', { class: 'sub' }, s.sub)), headRight);

    const actions = s.id === 'check' ? null : h('div', { class: 'row step-actions' },
      when
        ? h('button', { type: 'button', class: 'btn small', onclick: () => setDone(s, false) }, 'Undo')
        : h('button', { type: 'button', class: 'btn primary', onclick: () => setDone(s, true) }, s.doneLabel),
      !when && steps[i + 1] ? h('span', { class: 'small muted' }, `Then: ${steps[i + 1].title.toLowerCase()}`) : null);

    return h('section', { class: `step${when ? ' done' : ''}${isNow ? ' current' : ''}${later ? ' later' : ''}`, id: `step-${s.id}` },
      head,
      expanded ? h('div', { class: 'step-body fade-in' }, s.body(), actions) : null);
  }

  draw();

  const best = state.best.get(unit.id);
  return h('div', {},
    appHeader(),
    h('section', { class: 'unit-hero' },
      h('div', { class: 'wrap stack', style: 'position:relative;padding-top:30px;padding-bottom:26px;gap:8px' },
        h('a', { href: '#/dashboard', style: 'color:var(--saffron);font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-decoration:none' },
          `Unit ${unit.n} · Mounce ${unit.chapters} · Part ${unit.part}, ${PARTS[unit.part].name}`),
        h('h1', {}, unit.title),
        h('p', { style: 'margin:0;max-width:44em;color:var(--on-navy)' }, `Goal: ${unit.goal}`),
        h('div', { class: 'row', style: 'gap:10px;margin-top:4px' },
          h('span', { class: 'pill on-navy' }, `Class session: ${unit.session}`),
          best ? h('span', { class: 'pill on-navy' }, `Practice check: ${best.best}%`) : null),
        bar)),
    h('main', { class: 'page wrap unit-layout' },
      lesson ? list : h('div', { class: 'panel stack' },
        h('h2', { class: 'serif', style: 'font-size:26px;margin:0' }, 'Content for this unit is coming'),
        h('p', { class: 'muted', style: 'margin:0' }, `Units are prepared in batches. Read Mounce ${unit.chapters} for now; your notes are saved.`)),
      notes.el));
}

/** "Tue, Nov 3" (or "today"). */
function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (d.toDateString() === new Date().toDateString()) return 'today';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ------------------------------ the steps ------------------------------ */

/**
 * Turn a unit and its lesson into steps. The lesson's "before" list (written
 * per unit in src/content/lessons/) supplies the reading, the video and the
 * paper tasks; key ideas, paradigms, words and the check come from the
 * lesson and the unit's word list.
 */
function buildSteps(unit: Unit, lesson: Lesson | undefined): Step[] {
  if (!lesson) return [];
  const before = lesson.before;
  const reads = before.filter((t) => /^read\b/i.test(t));
  const watches = before.filter((t) => /^watch\b/i.test(t));
  const others = before.filter((t) => !reads.includes(t) && !watches.includes(t));
  const steps: Step[] = [];

  reads.forEach((t, i) => steps.push({
    id: i ? `read${i}` : 'read', title: t, sub: 'With the book open. Write in the notes as you go.',
    doneLabel: "I've read it", doneVerb: 'Read',
    body: () => h('p', { class: 'muted', style: 'margin:0' },
      'Read slowly, with the notes beside you: definitions in your own words, forms you want to remember, questions for class. ',
      'Type Greek with the keyboard under the notes.'),
  }));

  watches.forEach((t, i) => steps.push({
    id: i ? `watch${i}` : 'watch', title: t, sub: 'After the reading, to hear it explained.',
    doneLabel: "I've watched it", doneVerb: 'Watched',
    body: () => h('div', { class: 'stack', style: 'gap:10px' },
      videoLinks(overviewLinks(unit.chapters)),
      h('p', { class: 'muted', style: 'margin:0' }, 'Note anything the video says differently from the book, or more clearly.'),
      extraListening(unit.id).length
        ? h('div', { class: 'stack extra-listening', style: 'gap:6px' },
            h('span', { class: 'small' }, h('b', {}, 'Extra listening (optional). '),
              "Ted Hildebrandt's free audio on the same topic. His textbook is different, so his word list is not yours."),
            videoLinks(extraListening(unit.id), 'biblicalelearning.org'))
        : null),
  }));

  const ideasVisible = contentVisible(unit.id, 'ideas');
  steps.push({
    id: 'ideas', title: 'Key ideas',
    sub: `${lesson.ideas.cards.length ? lesson.ideas.cards.length + ' ideas, ' : ''}${lesson.ideas.points.length} points${lesson.ideas.watch ? ', 1 trap' : ''}`,
    doneLabel: "I've gone through the key ideas", doneVerb: 'Done',
    body: () => ideasVisible ? ideasBody(unit, lesson) : pending('The key ideas for this unit are being checked.'),
  });

  // Units that link to the alphabet drills (unit 2) get a practice step
  // with every drill, right after the key ideas.
  if (lesson.links?.some((l) => l.href === '#/alphabet')) steps.push({
    id: 'drills', title: 'Alphabet drills', sub: 'Learn, flashcards, speed, look-alikes, typing, sounding out',
    doneLabel: "I've practiced the alphabet", doneVerb: 'Done',
    body: () => h('div', { class: 'stack', style: 'gap:10px' },
      h('p', { class: 'muted', style: 'margin:0' }, 'Start with "Learn the letters", then the flashcards. Come back to the speed drill until every letter is quick. The drills are also under Alphabet in the menu.'),
      h('div', { class: 'row', style: 'gap:8px' }, ...ALPHABET_DRILLS.map(([href, label]) => h('a', { class: 'btn', href }, label)))),
  });

  if (lesson.paradigms.length) steps.push({
    id: 'paradigms', title: 'Paradigms', sub: lesson.paradigms.map((p) => p.title).join(' · '),
    doneLabel: "I've studied the tables", doneVerb: 'Done',
    body: () => ideasVisible
      ? h('div', { class: 'stack', style: 'gap:18px' },
          h('p', { class: 'small muted', style: 'margin:0' }, 'Say each table out loud, then hide the forms and recite it. Its cells join your daily review.'),
          ...lesson.paradigms.map(paradigmTable))
      : pending('The tables for this unit are being checked.'),
  });

  if (unit.words.length) steps.push({
    id: 'words', title: 'Words', sub: `${unit.words.length} words · they join your daily review`,
    doneLabel: "I've gone through the words", doneVerb: 'Done',
    body: () => contentVisible(unit.id, 'words') ? wordsBody(unit) : pending('The word list for this unit is being checked.'),
  });

  others.forEach((t, i) => steps.push({
    id: /workbook/i.test(t) ? (i ? `workbook${i}` : 'workbook') : `task${i}`, title: t, sub: /workbook/i.test(t) ? 'On paper. Mark it done when you finish.' : 'Mark it done when you finish.',
    doneLabel: "I've done it", doneVerb: 'Done',
    body: () => h('div', { class: 'stack', style: 'gap:10px' },
      /workbook/i.test(t) && screencastLinks(unit.chapters).length
        ? h('div', { class: 'stack', style: 'gap:6px' },
            h('span', { class: 'small muted' }, 'Stuck on an exercise? Mounce walks through them:'),
            videoLinks(screencastLinks(unit.chapters)))
        : null,
      h('p', { class: 'muted', style: 'margin:0' }, 'Note what was hard in the notes, so you can bring it to class.')),
  }));

  steps.push({
    id: 'check', title: 'Practice check', sub: 'Up to 12 questions · scores only · retake any time',
    doneLabel: '', doneVerb: '',
    body: () => checkBody(unit),
  });
  return steps;
}

/** The alphabet drills (src/modules/alphabet/), in the order to use them. */
const ALPHABET_DRILLS: Array<[string, string]> = [
  ['#/alphabet/learn', 'Learn the letters'], ['#/alphabet/cards', 'Flashcards'], ['#/alphabet/speed', 'Speed drill'],
  ['#/alphabet/lookalikes', 'Look-alikes'], ['#/alphabet/typing', 'Typing'], ['#/alphabet/sound', 'Sound it out'],
];

/** Buttons that open Mounce's videos on billmounce.com in a new tab. */
function videoLinks(links: VideoLink[], site = 'billmounce.com'): Node {
  return h('div', { class: 'row', style: 'gap:8px' }, ...links.map((l) =>
    h('a', { class: 'btn', href: l.href, target: '_blank', rel: 'noopener' }, '▶ ', l.label, h('span', { class: 'tiny muted', style: 'margin-left:6px' }, `${site} ↗`))));
}

function pending(text: string): Node {
  return h('p', { class: 'muted', style: 'margin:0' }, text);
}

/** Yellow banner for admins on content not yet checked against the book. */
function draftNote(unit: Unit, part: 'ideas' | 'words' | 'check', label: string): Node | null {
  if (!isAdmin() || state.status.get(`${unit.id}:${part}`) === 'checked') return null;
  const btn = h('button', { class: 'btn small', type: 'button' }, `Mark ${label} checked`);
  btn.addEventListener('click', async () => {
    await api('PUT', '/api/admin/content-status', { unit_id: unit.id, part, status: 'checked' });
    state.status.set(`${unit.id}:${part}`, 'checked');
    btn.replaceWith(h('span', { class: 'pill good' }, 'Checked'));
  });
  return h('div', { class: 'draft-banner row' },
    h('span', { style: 'flex:1 1 300px' }, h('b', {}, 'Draft. '), `Check the ${label} against Mounce ${unit.chapters}. Students don't see this until it is marked checked.`), btn);
}

function ideasBody(unit: Unit, lesson: Lesson): Node {
  return h('div', { class: 'stack', style: 'gap:14px' },
    draftNote(unit, 'ideas', 'key ideas and paradigms'),
    lesson.ideas.cards.length ? h('div', { class: 'grid2' }, ...lesson.ideas.cards.map((c) =>
      h('div', { class: 'idea-card' },
        h('span', { style: 'font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--cobalt, #2f5bd3)' }, c.label),
        h('p', { style: 'margin:6px 0 0' }, c.text),
        c.greek ? h('p', { class: 'eg' }, c.greek) : null,
        c.english ? h('p', { class: 'small muted', style: 'margin:0' }, c.english) : null))) : null,
    h('ul', { class: 'stack', style: 'margin:0;padding-left:20px;gap:6px' }, ...lesson.ideas.points.map((p) => h('li', {}, p))),
    lesson.ideas.watch ? h('div', { class: 'watch' }, h('b', {}, 'Watch out: '), lesson.ideas.watch) : null,
    lesson.links?.some((l) => l.href !== '#/alphabet') ? h('div', { class: 'grid2' }, ...lesson.links.filter((l) => l.href !== '#/alphabet').map((l) =>
      h('a', { class: 'panel', href: l.href, style: 'text-decoration:none;color:var(--ink)' },
        h('b', { style: 'display:block' }, l.label, ' →'), h('span', { class: 'muted small' }, l.text)))) : null);
}

function wordsBody(unit: Unit): Node {
  return h('div', { class: 'stack', style: 'gap:12px' },
    draftNote(unit, 'words', 'word list'),
    h('p', { class: 'small muted', style: 'margin:0' }, 'Say each word aloud; ▶ plays a recording where there is one. They are already in your daily review.'),
    h('div', { class: 'grid2', style: 'gap:10px' }, ...unit.words.map((w) =>
      h('div', { class: 'word-row' },
        h('span', { class: 'g' }, w.display ?? w.lemma),
        h('span', { class: 'm' }, h('span', {}, w.gloss),
          h('span', { class: 'tiny muted' }, `${LEXICON[w.lemma]?.f ?? '?'} times in the NT${w.note ? ' · ' + w.note : ''}`)),
        audioButton(`word:${w.lemma}`, w.lemma)))));
}

function checkBody(unit: Unit): Node {
  const best = state.best.get(unit.id);
  const canCheck = contentVisible(unit.id, 'check');
  return h('div', { class: 'stack', style: 'gap:10px' },
    draftNote(unit, 'check', 'practice check'),
    best
      ? h('p', { style: 'margin:0' }, h('b', { class: 'serif', style: 'font-size:32px' }, `${best.best}%`),
          h('span', { class: 'muted' }, `  best of ${best.attempts} ${best.attempts === 1 ? 'try' : 'tries'}`))
      : h('p', { class: 'muted', style: 'margin:0' }, 'Questions on this unit: ideas, forms and words. Your best score is kept.'),
    canCheck
      ? h('div', { class: 'row' }, h('a', { class: 'btn primary', href: `#/check/${unit.id}` }, best ? 'Take it again' : 'Take the check'))
      : pending('Available once the unit content is checked.'));
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

