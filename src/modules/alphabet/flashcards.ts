/**
 * flashcards.ts: spaced-repetition review of the 72 alphabet cards.
 *
 * FLOW
 *   1. Show the front. Try to recall the answer (say it aloud).
 *   2. Space (or tap) reveals the back.
 *   3. Rate yourself honestly:
 *        1 Again  I did not know it        -> comes back in about a minute
 *        2 Hard   I got it, with effort    -> short interval
 *        3 Good   I knew it                -> normal interval
 *        4 Easy   instant, no thought      -> long interval
 *      Each button shows when the card would come back.
 *   4. The next card appears. The queue is rebuilt after every rating, so a
 *      card you missed returns later in the same session.
 *
 * "Good" is the normal answer. Pressing Easy too often makes cards vanish
 * for weeks before they are solid; pressing Again when you knew it wastes
 * time. When in doubt, Good.
 */
import { h, mount } from '../../lib/dom';
import { putCard } from '../../lib/store';
import { recordAnswer } from '../../lib/store';
import { previewIntervals, Rating, review, type Grade } from '../../lib/srs';
import { setKeyHandler } from '../../router';
import { buildQueue, deckSummary, scheduleOf, type AlphaCard } from './cards';
import { speakerButton, speakLetter } from '../../components/speaker';
import { getSettings } from '../../lib/settings';

const GRADES: Array<{ grade: Grade; label: string; cls: string }> = [
  { grade: Rating.Again, label: 'Again', cls: 'again' },
  { grade: Rating.Hard, label: 'Hard', cls: '' },
  { grade: Rating.Good, label: 'Good', cls: 'good' },
  { grade: Rating.Easy, label: 'Easy', cls: '' },
];

export function flashcardsView(): Node {
  const root = h('div', { class: 'drill' });
  let reviewed = 0;

  function showNext(): void {
    const queue = buildQueue();
    if (queue.length === 0) return showDone();
    showFront(queue[0], queue.length);
  }

  function showFront(card: AlphaCard, remaining: number): void {
    const reveal = () => showBack(card, remaining);
    setKeyHandler((e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); } });
    mount(root, h('div', {},
      top(remaining),
      h('div', { class: 'prompt', onclick: reveal, style: 'cursor:pointer' }, front(card)),
      h('button', { class: 'primary', onclick: reveal, style: 'width:100%' }, 'Show answer ', h('kbd', {}, 'space')),
    ));
  }

  function showBack(card: AlphaCard, remaining: number): void {
    const schedule = scheduleOf(card.id);
    const intervals = previewIntervals(schedule);
    // Hearing the answer right after recalling it reinforces the sound.
    if (getSettings().autoSpeak) speakLetter(card.letter);
    const rate = (grade: Grade) => {
      putCard(card.id, review(schedule, grade));
      // Letter-level accuracy: Good or Easy count as "knew it".
      recordAnswer(`alpha:${card.letter.id}`, grade >= Rating.Good, 'flashcards');
      reviewed++;
      showNext();
    };
    setKeyHandler((e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4) rate(GRADES[n - 1].grade);
      if (e.key === ' ') { e.preventDefault(); rate(Rating.Good); }
      if (e.key === 'l') speakLetter(card.letter);
    });
    mount(root, h('div', {},
      top(remaining),
      h('div', { class: 'prompt' }, front(card), back(card)),
      h('div', { class: 'ratings' },
        GRADES.map((g, i) => h('button', { class: g.cls, onclick: () => rate(g.grade) },
          h('span', {}, h('kbd', {}, String(i + 1)), ' ', g.label),
          h('small', {}, intervals[g.grade])))),
      h('p', { class: 'muted small-text', style: 'margin-top:12px' }, 'Space = Good, L = listen again. Be honest: "Again" is how the schedule learns.'),
    ));
  }

  function showDone(): void {
    setKeyHandler(null);
    const d = deckSummary();
    mount(root, h('div', { class: 'prompt' },
      h('div', { class: 'q' }, 'Flashcards'),
      h('div', { class: 'name' }, reviewed ? 'Done for now' : 'Nothing due'),
      h('p', { class: 'muted' },
        reviewed ? `${reviewed} reviews this round. ` : '',
        `${d.learned} of ${d.total} cards learned. `,
        d.batch < 4 ? `Batch ${d.batch + 1} opens once batch ${d.batch} is learned.` : 'All four batches are open.'),
      h('div', { class: 'row', style: 'justify-content:center' },
        h('a', { class: 'button primary', href: '#/alphabet/speed' }, 'Speed drill'),
        h('a', { class: 'button', href: '#/alphabet' }, 'Back to alphabet')),
    ));
  }

  function top(remaining: number): Node {
    return h('div', { class: 'drill-top' }, h('span', {}, 'Flashcards'), h('span', {}, `${remaining} in queue · ${reviewed} done`));
  }

  showNext();
  return root;
}

/** The question side of each card kind. */
function front(card: AlphaCard): Node {
  const l = card.letter;
  if (card.kind === 'read') return h('div', {}, h('div', { class: 'q' }, 'Name and sound?'), h('div', { class: 'glyph' }, l.lower));
  if (card.kind === 'capital') return h('div', {}, h('div', { class: 'q' }, 'Which letter (lowercase and name)?'), h('div', { class: 'glyph' }, l.upper));
  return h('div', {}, h('div', { class: 'q' }, 'Picture or write it: lowercase and capital'), h('div', { class: 'name' }, l.name));
}

/** The answer side, the same for all kinds so every review reinforces everything. */
function back(card: AlphaCard): Node {
  const l = card.letter;
  return h('div', { class: 'back' },
    h('div', { class: 'glyphs' }, `${l.lower} ${l.upper}${l.id === 'sigma' ? ' ς' : ''}`),
    h('div', { style: 'font-size:22px;font-weight:700' }, l.name, h('span', { class: 'muted', style: 'font-weight:400' }, ` · ${l.translit}`)),
    h('div', { class: 'muted' }, l.sound),
    h('div', { style: 'margin-top:6px' }, h('span', { class: 'muted small-text' }, `say ${l.say.name} · ${l.example.greek} = ${l.say.example} `), speakerButton(l)),
    l.note ? h('div', { class: 'note', style: 'margin-top:10px;text-align:left' }, l.note) : null,
  );
}
