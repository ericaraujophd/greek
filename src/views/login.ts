/**
 * login.ts: the sign-in page.
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
import { brand } from '../components/layout';

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
  const status = h('div', { role: 'status', class: 'small', style: 'min-height:22px' });
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
        window.google.accounts.id.renderButton(googleSlot, { theme: 'outline', size: 'large', text: 'continue_with', width: 320 });
      } catch (e) { showError((e as Error).message); }
    } else {
      mount(googleSlot, h('p', { class: 'small muted' }, 'Google sign-in is not set up on this server yet.'));
    }

    if (cfg.devLogin) {
      const input = h('input', { class: 'text', type: 'email', placeholder: `name@${cfg.allowedDomain}`, 'aria-label': 'Invited email', style: 'flex:1' }) as HTMLInputElement;
      mount(devSlot, h('form', {
        class: 'stack', style: 'gap:8px;border:1px dashed #c7d2ea;border-radius:12px;padding:14px',
        onsubmit: async (e: Event) => {
          e.preventDefault();
          try {
            const r = await api<{ token: string }>('POST', '/api/auth/dev', { email: input.value });
            await finish(r.token, status);
          } catch (err) { showError((err as Error).message); }
        },
      },
        h('b', { class: 'small' }, 'Developer sign-in (local only)'),
        h('div', { class: 'row' }, input, h('button', { class: 'btn', type: 'submit' }, 'Sign in'))));
    }
  })();

  return h('div', { style: 'min-height:100vh;display:flex;flex-wrap:wrap' },
    h('div', { style: 'position:relative;overflow:hidden;flex:1 1 440px;background:var(--navy);color:#eef2fb;padding:48px;display:flex;flex-direction:column;justify-content:space-between;gap:32px;min-height:320px' },
      (() => { const b = brand('#/'); b.style.color = '#fff'; (b.firstChild as HTMLElement).style.background = 'var(--saffron)'; (b.firstChild as HTMLElement).style.color = 'var(--navy)'; return b; })(),
      h('div', { class: 'stack' },
        h('p', { class: 'greek', style: 'margin:0;font-size:44px;line-height:1.3;color:var(--saffron)' }, 'καὶ ὁ λόγος σὰρξ ἐγένετο'),
        h('p', { style: 'margin:0;color:var(--on-navy)' }, '"And the Word became flesh." John 1:14')),
      h('span', { class: 'small', style: 'color:var(--on-navy-2)' }, 'An independent study tool for Greek Fundamentals I. Invitation only.')),
    h('div', { style: 'flex:1 1 440px;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:48px 24px' },
      h('div', { class: 'stack', style: 'width:100%;max-width:400px;gap:20px' },
        h('div', {},
          h('h1', { class: 'serif', style: 'margin:0;font-size:38px' }, 'Sign in'),
          h('p', { class: 'muted', style: 'margin:8px 0 0' }, 'This tool is open by invitation. Use the seminary Google account your invitation was for. Your work is saved to your account, so you can switch between laptop, tablet and phone.')),
        googleSlot,
        devSlot,
        status,
        h('p', { class: 'tiny muted', style: 'margin:0' }, 'We store your name, email and study progress, nothing else.'),
        h('a', { href: '#/', class: 'small' }, 'Back to the front page'))));
}
