/**
 * notesPanel.ts: the notes that sit beside a unit while you study it.
 *
 * ONE NOTE PER UNIT, IN STUDY ORDER
 *   Each unit has one note (saved to your account, see saveNote in
 *   lib/progress.ts). When you start writing during a step, the panel first
 *   adds a heading line for that step, e.g.
 *
 *       ## 3 · Key ideas
 *
 *   unless the last heading in the note is already that one. So the note
 *   follows the order you actually studied in, and the My notes page can
 *   show it in sections. Headings are plain text lines starting with "## ";
 *   you can edit or delete them like anything else.
 *
 * Saved about a second after you stop typing. The Greek keyboard
 * (greekKeyboard.ts) sits under the text box.
 */
import { h } from '../lib/dom';
import { saveNote, state } from '../lib/progress';
import { greekKeyboard } from './greekKeyboard';

export interface NotesPanel {
  el: HTMLElement;
  /** Tell the panel which step you are on: "3 · Key ideas". */
  setStep(label: string): void;
}

export const HEADING = /^## (.+)$/gm;

/** The last "## ..." heading in a note, or null. */
function lastHeading(text: string): string | null {
  let last: string | null = null;
  for (const m of text.matchAll(HEADING)) last = m[1].trim();
  return last;
}

export function notesPanel(unitId: string, unitLabel: string): NotesPanel {
  let step = '';
  const status = h('span', { class: 'saved', role: 'status' }, '');
  const area = h('textarea', {
    class: 'notes-area greek-aware', id: 'unit-notes', spellcheck: 'false',
    placeholder: 'Your notes. Explain the chapter in your own words; copy forms you want to remember.',
    'aria-label': `Notes for ${unitLabel}`,
  }) as HTMLTextAreaElement;
  area.value = state.notes.get(unitId) ?? '';

  /** Before the first keystroke of a step, add that step's heading. */
  const ensureHeading = () => {
    if (!step || lastHeading(area.value) === step) return;
    const sep = area.value.trim() ? (area.value.endsWith('\n') ? '\n' : '\n\n') : '';
    area.value = `${area.value}${sep}## ${step}\n`;
    area.setSelectionRange(area.value.length, area.value.length);
    area.scrollTop = area.scrollHeight;
  };
  // Add the heading just before you start writing, but only when the cursor
  // is at the end of the note: editing an older section should not drop a
  // new heading into it. Registered before the Greek keyboard's own key
  // handler, so the heading goes in before the first letter.
  const atEnd = () => area.value.slice(area.selectionEnd ?? 0).trim() === '';
  const beforeWriting = () => { if (atEnd()) ensureHeading(); };
  area.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey) return;
    if (e.key.length === 1 || e.key === 'Enter') beforeWriting();
  });
  area.addEventListener('gk-before', beforeWriting);
  area.addEventListener('paste', beforeWriting);

  let timer: number | undefined;
  area.addEventListener('input', () => {
    status.textContent = 'Saving…';
    clearTimeout(timer);
    timer = window.setTimeout(async () => {
      try { await saveNote(unitId, area.value); status.textContent = 'Saved'; }
      catch { status.textContent = 'Not saved: is the server running?'; }
    }, 900);
  });

  const el = h('aside', { class: 'notes-panel', 'aria-label': 'Notes' },
    h('div', { class: 'np-head' },
      h('b', {}, 'Notes'), h('span', { class: 'small muted' }, unitLabel), status),
    area,
    greekKeyboard(area));

  return { el, setStep: (label) => { step = label; } };
}
