/**
 * front.ts: the public front page (no sign-in needed). Plain, factual
 * description of the tool, matching the approved mockup.
 */
import { h } from '../lib/dom';
import { brand } from '../components/layout';

const BAND = [
  ['λόγος', 'word'], ['θεός', 'God'], ['ἀγάπη', 'love'], ['πίστις', 'faith'], ['χάρις', 'grace'], ['ζωή', 'life'],
  ['φῶς', 'light'], ['κύριος', 'Lord'], ['ἐλπίς', 'hope'], ['εἰρήνη', 'peace'], ['ἀλήθεια', 'truth'], ['δόξα', 'glory'],
];

export function frontView(): Node {
  const band = [...BAND, ...BAND].map(([g, e]) =>
    h('span', { class: 'item' }, h('span', { class: 'greek', style: 'font-size:24px;color:var(--navy)' }, g),
      h('span', { class: 'small', style: 'color:#3d4766' }, e), h('span', { style: 'color:var(--navy);padding-left:22px' }, '·')));

  const step = (n: string, bg: string, fg: string, tint: string, text: Array<Node | string>) =>
    h('div', { style: `display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;background:${tint}` },
      h('span', { style: `display:inline-grid;place-items:center;width:36px;height:36px;border-radius:10px;background:${bg};color:${fg};font-weight:800` }, n),
      h('span', {}, ...text));

  return h('div', {},
    h('div', { class: 'hero' },
      h('span', { class: 'watermark', 'aria-hidden': 'true' }, 'λόγος'),
      h('header', { class: 'wrap', style: 'position:relative;padding-top:22px;padding-bottom:22px;display:flex;flex-wrap:wrap;align-items:center;gap:16px' },
        (() => { const b = brand('#/'); b.style.color = '#fff'; (b.firstChild as HTMLElement).style.background = 'var(--saffron)'; (b.firstChild as HTMLElement).style.color = 'var(--navy)'; return b; })(),
        h('nav', { style: 'margin-left:auto;display:flex;flex-wrap:wrap;gap:6px;align-items:center' },
          h('a', { href: '#contents', style: 'text-decoration:none;padding:8px 12px;color:var(--on-navy)', onclick: (e: Event) => { e.preventDefault(); document.getElementById('contents')?.scrollIntoView(); } }, 'Contents'),
          h('a', { href: '#/login', class: 'btn saffron' }, 'Sign in'))),
      h('section', { class: 'wrap', style: 'position:relative;padding-top:40px;padding-bottom:72px;display:flex;flex-wrap:wrap;gap:48px;align-items:center' },
        h('div', { class: 'stack', style: 'flex:1 1 480px;gap:20px' },
          h('div', { class: 'row', style: 'gap:8px' }, h('span', { class: 'badge-saffron' }, 'Greek Fundamentals I'), h('span', { class: 'badge-outline' }, 'Invitation only')),
          h('h1', {}, 'A study tool for Greek Fundamentals I'),
          h('p', { class: 'lead' }, 'Review, practice and reading exercises that follow Mounce\'s ', h('i', {}, 'Basics of Biblical Greek'),
            ' and the course syllabus, chapter by chapter. Use it alongside the book and the class.'),
          h('div', { class: 'row' }, h('a', { href: '#/login', class: 'btn saffron big' }, 'Sign in'),
            h('span', { class: 'small', style: 'color:var(--on-navy-2)' }, 'With an invited @calvinseminary.edu Google account'))),
        h('div', { style: 'flex:1 1 380px' },
          h('div', { class: 'stack', style: 'background:#fff;color:var(--ink);border-radius:20px;padding:24px;box-shadow:0 30px 70px rgba(0,0,0,.3)' },
            h('div', { class: 'row' }, h('span', { class: 'eyebrow', style: 'font-size:12px' }, 'Example session'), h('span', { class: 'tiny muted', style: 'margin-left:auto' }, 'about 30 min')),
            step('1', 'var(--cobalt)', '#fff', 'var(--cobalt-soft)', [h('b', {}, 'Review'), ' · cards due from earlier chapters']),
            step('2', 'var(--saffron)', 'var(--navy)', 'var(--saffron-soft)', [h('b', {}, 'Current unit'), ' · key ideas, paradigm, words']),
            step('3', 'var(--green)', '#fff', 'var(--green-soft)', [h('b', {}, 'Read'), ' · ', h('span', { class: 'greek', style: 'font-size:18px' }, 'Ἐν ἀρχῇ ἦν ὁ λόγος')]))))),
    h('div', { class: 'marquee-band', 'aria-hidden': 'true' }, h('div', { class: 'marquee' }, band)),
    h('section', { id: 'contents', class: 'wrap stack', style: 'padding-top:64px;padding-bottom:24px;gap:24px' },
      h('h2', { class: 'serif', style: 'margin:0;font-size:36px' }, 'What\'s in it'),
      h('div', { class: 'grid3' },
        ...[
          ['var(--cobalt)', 'Units by syllabus', '24 units for chapters 1 to 21, in the order of the class sessions, with a practice quiz for each class quiz.'],
          ['var(--saffron)', 'Spaced review', 'Words, endings and paradigms come back on a schedule. A wrong answer shows the reason.'],
          ['var(--green)', 'Reading', 'Short New Testament passages, with help for every word you have not learned yet.'],
        ].map(([c, t, d]) => h('div', { class: 'stack', style: `background:#fff;border-radius:16px;padding:22px;gap:8px;border-top:5px solid ${c}` },
          h('b', { style: 'font-size:18px' }, t), h('span', { class: 'muted' }, d))))),
    h('section', { class: 'wrap', style: 'padding-top:40px;padding-bottom:64px;display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start' },
      h('div', { class: 'stack', style: 'flex:1 1 360px;gap:12px' },
        h('h2', { class: 'serif', style: 'margin:0;font-size:36px' }, 'How a unit is organized'),
        h('p', { class: 'muted', style: 'margin:0' }, 'Read the chapter in Mounce first. Each unit then has the chapter\'s key ideas, its paradigms, its words, space for your own notes, and a practice check you can repeat.')),
      h('ol', { class: 'grid2', style: 'flex:1 1 460px;margin:0;padding:0;list-style:none' },
        ...[['Part 1 · Foundations', 'Ch. 1 to 4'], ['Part 2 · Nouns and cases', 'Ch. 5 to 10'], ['Part 3 · Pronouns', 'Ch. 11 to 14'], ['Part 4 · Indicative verbs', 'Ch. 15 to 21']]
          .map(([t, c]) => h('li', { style: 'background:#fff;border-radius:14px;padding:16px 18px' }, h('b', { style: 'display:block' }, t), h('span', { class: 'muted small' }, c))))),
    h('footer', { class: 'site' },
      h('div', { class: 'wrap row small', style: 'padding-top:26px;padding-bottom:26px' },
        h('span', {}, 'An independent project by Eric Araújo, by invitation. Not an official Calvin Theological Seminary resource.'),
        h('span', { style: 'margin-left:auto' }, 'Greek text: SBL Greek New Testament. Parsing: MorphGNT (CC BY-SA).'))),
  );
}
