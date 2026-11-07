/**
 * notes.ts: all your unit notes on one page (#/notes), with search.
 *
 * READING
 *   Notes are written beside each unit (components/notesPanel.ts). Here
 *   they are shown in course order, split into the sections the unit page
 *   started ("## 3 · Key ideas"), with Greek set in the Greek font and
 *   coloured, so forms stand out. To edit, open the unit ("Edit in unit").
 *
 * SEARCHING
 *   The search ignores accents, breathings, capitals and final sigma
 *   (lib/greekInput.ts plain()), so λογος finds λόγος and Λόγος. Only the
 *   sections that match are shown, with every match highlighted. The Greek
 *   keyboard under the box types into it; ⌥G turns on Type Greek.
 */
import { h } from '../lib/dom';
import { appHeader } from '../components/layout';
import { greekKeyboard } from '../components/greekKeyboard';
import { isGreekLetter, plain } from '../lib/greekInput';
import { state } from '../lib/progress';
import { UNITS, type Unit } from '../content/units';

interface Section { heading: string; text: string }

/** Split a note at its "## ..." heading lines. */
function sections(note: string): Section[] {
  const out: Section[] = [];
  let cur: Section = { heading: '', text: '' };
  for (const line of note.split('\n')) {
    const m = /^## (.+)$/.exec(line);
    if (m) { if (cur.heading || cur.text.trim()) out.push(cur); cur = { heading: m[1].trim(), text: '' }; }
    else cur.text += (cur.text ? '\n' : '') + line;
  }
  if (cur.heading || cur.text.trim()) out.push(cur);
  return out.map((s) => ({ ...s, text: s.text.trim() }));
}

/**
 * Draw text with Greek runs in the Greek font and matches of `q` (already
 * plain()) highlighted. Works character by character, because plain() can
 * change the length of a string (it drops accents); comparing one
 * character at a time keeps the positions lined up with the original.
 */
function rich(text: string, q: string): Node[] {
  const chars = [...text.normalize('NFC')];
  const flat = chars.map((c) => plain(c));
  // Mark which characters are inside a match.
  const hit = new Array(chars.length).fill(false);
  if (q) {
    for (let i = 0; i < chars.length; i++) {
      let j = i, k = 0;
      while (j < chars.length && k < q.length) {
        const f = flat[j];
        if (!f) { j++; continue; }
        if (q.startsWith(f, k)) { k += f.length; j++; } else break;
      }
      if (k === q.length) for (let x = i; x < j; x++) hit[x] = true;
    }
  }
  // Group runs with the same (greek?, hit?) and draw them.
  const nodes: Node[] = [];
  let run = '', runGreek = false, runHit = false;
  const flush = () => {
    if (!run) return;
    let n: Node = document.createTextNode(run);
    if (runGreek) n = h('span', { class: 'gr' }, n);
    if (runHit) n = h('mark', {}, n);
    nodes.push(n);
    run = '';
  };
  chars.forEach((c, i) => {
    const greek = isGreekLetter(c) || (runGreek && /[\u0300-\u036f]/.test(c));
    if (run && (greek !== runGreek || hit[i] !== runHit)) flush();
    runGreek = greek; runHit = hit[i];
    run += c;
  });
  flush();
  return nodes;
}

export function notesView(): Node {
  const results = h('div', { class: 'stack', style: 'gap:18px' });
  const search = h('input', { type: 'search', class: 'text', placeholder: 'Search your notes: English or Greek, accents optional', 'aria-label': 'Search notes', style: 'width:100%;font-size:17px' }) as HTMLInputElement;
  const count = h('span', { class: 'small muted', role: 'status' });

  const withNotes: Array<{ unit: Unit; secs: Section[] }> = UNITS
    .map((unit) => ({ unit, secs: sections(state.notes.get(unit.id) ?? '') }))
    .filter((x) => x.secs.length);

  function draw() {
    const q = plain(search.value.trim());
    let shown = 0;
    const blocks = withNotes.map(({ unit, secs }) => {
      const match = q ? secs.filter((s) => plain(`${s.heading}\n${s.text}`).includes(q)) : secs;
      if (!match.length) return null;
      shown += match.length;
      return h('section', { class: 'panel stack', style: 'gap:12px' },
        h('div', { class: 'row', style: 'align-items:baseline' },
          h('a', { href: `#/unit/${unit.id}`, class: 'serif', style: 'font-size:22px;font-weight:600;color:var(--ink);text-decoration:none' }, `Unit ${unit.n}: ${unit.title}`),
          h('span', { class: 'small muted' }, `Mounce ${unit.chapters}`),
          h('a', { href: `#/unit/${unit.id}`, class: 'btn small', style: 'margin-left:auto' }, 'Edit in unit')),
        ...match.map((s) => h('div', { class: 'note-sec' },
          s.heading ? h('div', { class: 'note-h' }, ...rich(s.heading, q)) : null,
          h('div', { class: 'note-t' }, ...rich(s.text, q)))));
    }).filter(Boolean) as Node[];
    count.textContent = q ? `${shown} matching section${shown === 1 ? '' : 's'}` : '';
    results.replaceChildren(...(blocks.length ? blocks
      : [h('div', { class: 'panel' }, h('p', { style: 'margin:0' }, q ? 'Nothing matches.' : 'No notes yet. Each unit page has a notes panel beside the steps.'))]));
  }
  search.addEventListener('input', draw);
  draw();

  return h('div', {}, appHeader(), h('main', { class: 'page wrap stack fade-in', style: 'gap:20px' },
    h('div', { class: 'row', style: 'align-items:baseline' },
      h('h1', { class: 'serif', style: 'margin:0;font-size:34px' }, 'My notes'),
      h('span', { class: 'muted' }, 'Private to you, in course order.')),
    h('div', { class: 'panel stack', style: 'gap:8px' },
      search,
      h('div', { class: 'row' }, count),
      h('details', {}, h('summary', { class: 'small', style: 'cursor:pointer' }, 'Greek keyboard'), greekKeyboard(search))),
    results));
}
