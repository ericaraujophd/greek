/**
 * home.ts: the "Today" screen. Answers three questions at a glance:
 *   1. Where am I in the plan?   (week number and this week's chapters)
 *   2. What should I do now?     (a suggested 30-minute session)
 *   3. What exists and what is coming? (module tiles, with the plan week
 *      in which each future module becomes useful)
 */
import { h } from '../lib/dom';
import { deckSummary } from '../modules/alphabet/cards';
import { isStudyDay, planWeek, WEEKS } from '../plan';
import { syncConfigured } from '../lib/settings';

/** Modules, built and planned. `week` = plan week in which it is needed. */
const MODULES = [
  { href: '#/alphabet', glyph: 'αβγ', title: 'Alphabet', text: 'Letters, sounds, look-alikes, typing, first words.', week: 1, ready: true },
  { href: '', glyph: 'ἁ ἀ', title: 'Breathings and accents', text: 'Rough and smooth breathing, diphthongs, syllables.', week: 2, ready: false },
  { href: '', glyph: 'λόγ-ος', title: 'Noun endings', text: 'Fill-in paradigm tables for the three declensions, timed.', week: 3, ready: false },
  { href: '', glyph: 'λέγω', title: 'Vocabulary', text: 'Mounce chapter lists with spaced repetition.', week: 3, ready: false },
  { href: '', glyph: 'ἔλυσα?', title: 'Parsing', text: 'Real NT forms: identify tense, voice, mood, person, number.', week: 21, ready: false },
  { href: '', glyph: 'Ἐν ἀρχῇ', title: 'Reader', text: 'Verse by verse with tap-for-gloss, from the Saturday readings.', week: 11, ready: false },
];

export function homeView(): Node {
  const week = planWeek();
  const d = deckSummary();
  const today = new Date();
  const weekText = week === 0 ? 'The plan starts Tuesday, 29 September.'
    : week > WEEKS.length ? 'Plan complete. Time for the seminary course.'
    : `Week ${week} of ${WEEKS.length}: ${WEEKS[week - 1]}`;

  return h('div', {},
    h('h1', {}, today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })),
    h('p', { class: 'lead' }, weekText, isStudyDay(today) ? ' · study day' : ''),

    h('div', { class: 'panel' },
      h('h2', { style: 'margin-top:0' }, 'Suggested session'),
      h('ol', { class: 'steps' },
        h('li', {}, h('b', {}, 'Flashcards'), ` (5 to 10 min): ${d.queue} card${d.queue === 1 ? '' : 's'} waiting.`),
        h('li', {}, h('b', {}, 'Mounce'), ' (15 min): read the chapter or do the workbook for today.'),
        h('li', {}, h('b', {}, 'One drill'), ' (5 min): speed, look-alikes, typing or sound it out.'),
      ),
      h('div', { class: 'row' },
        h('a', { class: 'button primary', href: '#/alphabet/cards' }, d.queue ? `Start flashcards (${d.queue})` : 'Flashcards'),
        h('a', { class: 'button', href: '#/alphabet' }, 'All alphabet drills')),
      !syncConfigured()
        ? h('p', { class: 'muted small-text', style: 'margin:14px 0 0' },
            'Progress is only on this device. ', h('a', { href: '#/settings' }, 'Set up GitHub sync'), ' to keep it safe and share it across devices.')
        : null,
    ),

    h('h2', {}, 'Modules'),
    h('div', { class: 'grid' },
      MODULES.map((m) => h(m.ready ? 'a' : 'div', { class: m.ready ? 'tile' : 'tile locked', href: m.ready ? m.href : false },
        h('div', { class: 'tile-glyph' }, m.glyph),
        h('h3', {}, m.title),
        h('p', {}, m.text),
        m.ready ? null : h('span', { class: 'when' }, `Coming by week ${m.week}`)))),
  );
}
