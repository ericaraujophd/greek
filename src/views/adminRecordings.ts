/**
 * adminRecordings.ts: the "Recordings" part of the Admin page.
 *
 * OFFERED BY STUDENTS
 *   Students can record themselves and offer a recording as the shared one
 *   (components/audioButton.ts). Each offer is listed here: play theirs,
 *   play the current shared recording (if any), then Accept (theirs
 *   replaces the shared one, credited to them) or Decline.
 *
 * STILL TO RECORD
 *   Everything the course pronounces, in course order: the 24 letter names,
 *   the alphabet's example words, then each drafted unit's words. Each line
 *   has the usual record control, so you can work down the list in one
 *   sitting. "Show all" also lists the ones already recorded (to re-record).
 */
import { h } from '../lib/dom';
import { api } from '../lib/api';
import { state } from '../lib/progress';
import { audioButton, clipUrl, play } from '../components/audioButton';
import { LETTERS } from '../modules/alphabet/data';
import { UNITS } from '../content/units';

interface Item { key: string; greek: string; gloss: string }
interface Group { title: string; items: Item[] }

/** Everything the course pronounces, grouped, in course order, without repeats. */
function courseItems(): Group[] {
  const seen = new Set<string>();
  const keep = (items: Item[]) => items.filter((i) => !seen.has(i.key) && seen.add(i.key));
  const groups: Group[] = [
    { title: 'Letter names', items: keep(LETTERS.map((l) => ({ key: `letter:${l.id}`, greek: `${l.upper} ${l.lower}`, gloss: l.name }))) },
    { title: 'Alphabet example words', items: keep(LETTERS.map((l) => ({ key: `word:${l.example.greek}`, greek: l.example.greek, gloss: l.example.gloss }))) },
  ];
  for (const u of UNITS.filter((x) => x.drafted && x.words.length)) {
    groups.push({ title: `Unit ${u.n}: ${u.title} (${u.chapters})`,
      items: keep(u.words.map((w) => ({ key: `word:${w.lemma}`, greek: w.display ?? w.lemma, gloss: w.gloss }))) });
  }
  return groups.filter((g) => g.items.length);
}

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const shown = (key: string) => key.replace(/^word:/, '').replace(/^letter:/, 'letter ');

export async function recordingsSection(): Promise<HTMLElement> {
  const { submissions } = await api<{ submissions: Array<{ id: number; key: string; created_at: string; name: string; email: string; has_shared: boolean }> }>(
    'GET', '/api/admin/audio-submissions');

  /* ------------------------------ offers ------------------------------ */
  const offers = h('div', { class: 'stack', style: 'gap:8px' });
  const drawOffers = (list: typeof submissions) => offers.replaceChildren(...(list.length
    ? list.map((s) => {
        const row = h('div', { class: 'row offer', style: 'gap:10px;align-items:center;border-bottom:1px solid var(--line-2);padding:8px 0' },
          h('span', { class: 'greek', style: 'font-size:22px;min-width:130px' }, shown(s.key)),
          h('span', { class: 'small', style: 'flex:1 1 160px' }, `${s.name || s.email}, ${when(s.created_at)}`),
          h('button', { type: 'button', class: 'btn small', 'aria-label': `Play ${s.name || s.email}'s recording of ${shown(s.key)}`,
            onclick: async () => { const r = await api('GET', `/api/admin/audio-submissions/${s.id}`); play(clipUrl(r.mime, r.data)); } }, '▶ Theirs'),
          s.has_shared ? h('button', { type: 'button', class: 'btn small', 'aria-label': `Play the current recording of ${shown(s.key)}`,
            onclick: async () => { const r = await api('GET', `/api/audio/${encodeURIComponent(s.key)}`); play(clipUrl(r.mime, r.data)); } }, '▶ Current') : h('span', { class: 'tiny muted' }, 'no shared recording yet'),
          h('button', { type: 'button', class: 'btn small primary', onclick: async () => {
            const r = await api<{ recorded_by: string }>('POST', `/api/admin/audio-submissions/${s.id}/accept`, {});
            state.audio.set(s.key, { recorded_by: r.recorded_by });
            drawOffers(list.filter((x) => x.id !== s.id));
            drawTodo();
          } }, 'Accept'),
          h('button', { type: 'button', class: 'btn small', onclick: async () => {
            await api('POST', `/api/admin/audio-submissions/${s.id}/decline`, {});
            drawOffers(list.filter((x) => x.id !== s.id));
          } }, 'Decline'));
        return row;
      })
    : [h('p', { class: 'muted', style: 'margin:0' }, 'No recordings offered by students.')]));
  drawOffers(submissions);

  /* ------------------------------ still to record ------------------------------ */
  const groups = courseItems();
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  let showAll = false;
  const count = h('span', { class: 'small muted' });
  const todo = h('div', { class: 'stack', style: 'gap:16px' });
  const toggle = h('button', { type: 'button', class: 'btn small' }, 'Show all');
  toggle.addEventListener('click', () => { showAll = !showAll; toggle.textContent = showAll ? 'Only missing' : 'Show all'; drawTodo(); });

  function drawTodo() {
    const done = groups.reduce((n, g) => n + g.items.filter((i) => state.audio.has(i.key)).length, 0);
    count.textContent = `${done} of ${total} recorded`;
    const blocks = groups.map((g) => {
      const items = showAll ? g.items : g.items.filter((i) => !state.audio.has(i.key));
      if (!items.length) return null;
      return h('div', { class: 'stack', style: 'gap:6px' },
        h('b', {}, g.title),
        h('div', { class: 'rec-grid' }, ...items.map((i) => h('div', { class: 'rec-item' },
          h('span', { class: 'greek', style: 'font-size:20px' }, i.greek),
          h('span', { class: 'small muted', style: 'flex:1' }, i.gloss),
          audioButton(i.key, i.greek)))));
    }).filter(Boolean) as Node[];
    todo.replaceChildren(...(blocks.length ? blocks : [h('p', { class: 'muted', style: 'margin:0' }, 'Everything is recorded.')]));
  }
  drawTodo();

  return h('section', { class: 'panel stack', style: 'gap:14px' },
    h('h2', { class: 'serif', style: 'font-size:24px' }, 'Recordings'),
    h('p', { class: 'small muted', style: 'margin:0' }, 'One shared recording per word, heard by everyone. Students can record themselves privately and offer theirs.'),
    h('h3', { style: 'margin:6px 0 0;font-size:17px' }, `Offered by students (${submissions.length})`),
    offers,
    h('div', { class: 'row', style: 'align-items:baseline;margin-top:8px' },
      h('h3', { style: 'margin:0;font-size:17px' }, 'Still to record'), count, h('span', { style: 'margin-left:auto' }, toggle)),
    h('p', { class: 'small muted', style: 'margin:0' }, '● Record, say the word, Save. A recording disappears from this list once saved; the next one is ready below.'),
    todo);
}
