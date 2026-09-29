/**
 * speaker.ts: the "Listen" button used on the Learn screen and flashcards.
 * It reads the letter's name, then its example word, using the Erasmian
 * respellings from data.ts (see lib/speech.ts for how and why).
 * Renders nothing if the browser cannot speak.
 */
import { h } from '../lib/dom';
import { speak, speechAvailable } from '../lib/speech';
import type { Letter } from '../modules/alphabet/data';

export function speakLetter(l: Letter): void {
  speak(l.say.name, l.say.example);
}

export function speakerButton(l: Letter): Node | null {
  if (!speechAvailable()) return null;
  return h('button', {
    class: 'small', type: 'button', title: `Hear "${l.say.name}" and "${l.say.example}"`,
    onclick: (e: Event) => { e.stopPropagation(); speakLetter(l); },
  }, '▶ Listen');
}
