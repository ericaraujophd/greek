/**
 * login.ts: the sign-in page, which is also the front page (#/ and #/login).
 *
 * WHAT IS ON IT (approved mockup, Nov 6 2026)
 *   The logo, the name, one line saying this is a personal, unofficial tool,
 *   the sign-in card, and a footer saying it is not affiliated with the
 *   seminary or the publisher. Nothing else: no marketing, no tour.
 *   Behind it, three quiet decorative layers (styles.css, "Sign-in page").
 *
 * If you are already signed in, #/ sends you straight to the dashboard
 * (see main.ts).
 *
 * GOOGLE SIGN-IN
 *   Loads Google Identity Services and renders Google's own button. When the
 *   student picks an account, Google calls handleCredential() with an ID
 *   token, which we send to the server to verify (see server/auth.ts).
 *   `hd: calvinseminary.edu` asks Google to offer only seminary accounts
 *   first; the server enforces it regardless.
 *
 * DEVELOPER SIGN-IN
 *   Shown only when the server says DEV_LOGIN is on (your Mac). Type any
 *   invited @calvinseminary.edu address to sign in as that person.
 */
import { h, mount } from '../lib/dom';
import { api, setToken } from '../lib/api';
import { go } from '../router';
import { logoMark } from '../components/logo';

interface Config { googleClientId: string | null; devLogin: boolean; allowedDomain: string }

declare global {
  interface Window { google?: any }
}

async function finish(token: string, status: HTMLElement): Promise<void> {
  setToken(token);
  status.textContent = 'Signed in. Loading your work…';
  go('/dashboard');
  location.reload();
}

function loadGoogle(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Google sign-in.'));
    document.head.appendChild(s);
  });
}

export function loginView(): Node {
  const status = h('div', { role: 'status', class: 'small' });
  const googleSlot = h('div', { style: 'min-height:44px' });
  const devSlot = h('div', {});

  const showError = (msg: string) => mount(status, h('div', { class: 'feedback bad' }, msg));

  void (async () => {
    let cfg: Config;
    try { cfg = await api<Config>('GET', '/api/config'); } catch (e) { showError((e as Error).message); return; }

    if (cfg.googleClientId) {
      try {
        await loadGoogle();
        window.google.accounts.id.initialize({
          client_id: cfg.googleClientId,
          hd: cfg.allowedDomain,
          callback: async (resp: { credential: string }) => {
            status.textContent = 'Checking your invitation…';
            try {
              const r = await api<{ token: string }>('POST', '/api/auth/google', { credential: resp.credential });
              await finish(r.token, status);
            } catch (e) { showError((e as Error).message); }
          },
        });
        window.google.accounts.id.renderButton(googleSlot, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: 344 });
      } catch (e) { showError((e as Error).message); }
    } else {
      mount(googleSlot, h('p', { class: 'small muted' }, 'Google sign-in is not set up on this server yet.'));
    }

    if (cfg.devLogin) {
      const input = h('input', { class: 'text', type: 'email', placeholder: `name@${cfg.allowedDomain}`, 'aria-label': 'Invited email', style: 'flex:1;min-width:0' }) as HTMLInputElement;
      mount(devSlot, h('form', {
        class: 'dev',
        onsubmit: async (e: Event) => {
          e.preventDefault();
          try {
            const r = await api<{ token: string }>('POST', '/api/auth/dev', { email: input.value });
            await finish(r.token, status);
          } catch (err) { showError((err as Error).message); }
        },
      },
        h('span', { class: 'lbl' }, 'Developer sign-in · only on your Mac'),
        h('div', { class: 'row', style: 'gap:8px;flex-wrap:nowrap' }, input, h('button', { class: 'btn primary', type: 'submit' }, 'Sign in'))));
    }
  })();

  return h('div', { class: 'signin' },
    // Decorative background (hidden from screen readers).
    h('div', { class: 'glow g1', 'aria-hidden': 'true' }),
    h('div', { class: 'glow g2', 'aria-hidden': 'true' }),
    h('div', { class: 'grid', 'aria-hidden': 'true' }),
    h('div', { class: 'lines', 'aria-hidden': 'true' }, ...backgroundLines()),

    h('div', { class: 'intro' },
      logoMark(64),
      h('h1', {}, 'Greek Companion'),
      h('p', {}, 'A personal, unofficial study companion, made for my own study of Greek Fundamentals I at Calvin Theological Seminary alongside Mounce, ',
        h('i', {}, 'Basics of Biblical Greek'), '.')),

    h('div', { class: 'card' }, googleSlot, devSlot, status),

    h('p', { class: 'foot' },
      'A personal tool for personal use. Unofficial: not affiliated with or endorsed by Calvin Theological Seminary or Zondervan. Greek text: SBLGNT via MorphGNT (CC BY-SA).'));
}

/* ------------------------------------------------------------------------ */
/* Background text: John 1:1 to 5 and 1:14, one verse-part per line, nine    */
/* lines. Each line holds its text twice so it can slide by half its width   */
/* and loop without a jump. Lines alternate direction and speed.             */
/* ------------------------------------------------------------------------ */
const JOHN = [
  'Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος.',
  'οὗτος ἦν ἐν ἀρχῇ πρὸς τὸν θεόν. πάντα δι’ αὐτοῦ ἐγένετο,',
  'ἐν αὐτῷ ζωὴ ἦν, καὶ ἡ ζωὴ ἦν τὸ φῶς τῶν ἀνθρώπων·',
  'καὶ τὸ φῶς ἐν τῇ σκοτίᾳ φαίνει, καὶ ἡ σκοτία αὐτὸ οὐ κατέλαβεν.',
  'καὶ ὁ λόγος σὰρξ ἐγένετο καὶ ἐσκήνωσεν ἐν ἡμῖν,',
  'πλήρης χάριτος καὶ ἀληθείας.',
];

function backgroundLines(): HTMLElement[] {
  return Array.from({ length: 9 }, (_, i) => {
    const text = `${JOHN[i % JOHN.length]}   `.repeat(4);
    return h('div', { class: `line ${i % 2 ? 'r' : 'l'}`, style: `animation-duration:${140 + ((i * 23) % 60)}s` },
      h('span', {}, text), h('span', {}, text));
  });
}
