/**
 * admin.ts: the admin page (#/admin). Visible to admins only; the server
 * refuses every /api/admin call from anyone else, so hiding the link is a
 * convenience, not the protection.
 *
 * SECTIONS
 *   Summary      students, active this week, pending invitations, parts checked.
 *   Invitations  the allowlist. Adding an address sends NO email: tell the
 *                student yourself, they sign in with that Google account.
 *                Revoking blocks the next request they make.
 *   Students     last seen, review accuracy this week, latest unit, best
 *                practice quiz scores; make someone an admin or not.
 *   Content      for every drafted unit, whether key ideas, words and the
 *                practice check are checked. Students only see checked parts.
 */
import { h, mount } from '../lib/dom';
import { appHeader, errorBox, loading, scoreColor } from '../components/layout';
import { api } from '../lib/api';
import { state } from '../lib/progress';
import { QUIZZES, UNITS } from '../content/units';
import { refresh } from '../router';

const PARTS = [['ideas', 'Key ideas & tables'], ['words', 'Words'], ['check', 'Practice check']] as const;

function when(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 14 ? `${days} days ago` : d.toLocaleDateString();
}

export async function adminView(): Promise<Node> {
  const main = h('main', { class: 'page wrap stack fade-in', style: 'gap:24px' }, loading());
  const page = h('div', {}, appHeader(), main);
  let summary: any, students: any, invites: any;
  try {
    [summary, students, invites] = await Promise.all([
      api('GET', '/api/admin/summary'), api('GET', '/api/admin/students'), api('GET', '/api/admin/invitations')]);
  } catch (e) {
    mount(main, errorBox((e as Error).message));
    return page;
  }

  /* ------------------------------ summary ------------------------------ */
  const tiles: Array<[string | number, string]> = [
    [summary.users, 'people signed in'], [summary.active7, 'active this week'],
    [summary.pending, 'invitations not used yet'], [summary.checked, 'content parts checked'],
  ];

  /* ------------------------------ invitations ------------------------------ */
  const inviteMsg = h('span', { class: 'small', 'aria-live': 'polite' });
  const inviteBox = h('input', { type: 'text', placeholder: 'name@calvinseminary.edu, another@calvinseminary.edu', style: 'flex:1 1 320px', 'aria-label': 'Addresses to invite' }) as HTMLInputElement;
  const invite = async () => {
    try {
      const r = await api('POST', '/api/admin/invitations', { emails: inviteBox.value });
      inviteMsg.textContent = `${r.added} added. No email was sent; let them know.`;
      setTimeout(refresh, 900);
    } catch (e) { inviteMsg.textContent = (e as Error).message; }
  };
  const inviteRows = invites.invitations.map((i: any) => {
    const status = i.revoked_at ? 'revoked' : i.accepted_at ? `signed in ${when(i.accepted_at)}` : 'not used yet';
    return h('tr', {},
      h('td', {}, i.email), h('td', { class: 'muted' }, status), h('td', { class: 'muted small' }, `by ${i.invited_by ?? '?'}, ${when(i.created_at)}`),
      h('td', {}, i.revoked_at ? null : h('button', { class: 'btn small', type: 'button', onclick: async () => {
        if (!confirm(`Revoke access for ${i.email}?`)) return;
        await api('POST', '/api/admin/invitations/revoke', { email: i.email });
        refresh();
      } }, 'Revoke')));
  });

  /* ------------------------------ students ------------------------------ */
  const quizIds = QUIZZES.filter((q) => q.id !== 'exam').map((q) => q.id);
  const studentRows = students.students.map((s: any) => h('tr', {},
    h('td', {}, h('b', {}, s.name || s.email.split('@')[0]), h('div', { class: 'tiny muted' }, s.email)),
    h('td', { class: 'muted' }, when(s.last_seen_at)),
    h('td', {}, s.acc7 === null ? '' : `${s.acc7}%`),
    h('td', {}, s.last_unit ? `Unit ${UNITS.find((u) => u.id === s.last_unit)?.n ?? s.last_unit}` : ''),
    ...quizIds.map((q) => {
      const v = s.quizzes?.[q];
      return h('td', { style: v === undefined ? '' : `color:${scoreColor(v)};font-weight:700` }, v === undefined ? '' : `${v}%`);
    }),
    h('td', {}, s.id === state.user?.id ? h('span', { class: 'tiny muted' }, s.role) : h('select', {
      'aria-label': `Role for ${s.email}`,
      onchange: async (e: Event) => { await api('PUT', `/api/admin/users/${s.id}/role`, { role: (e.target as HTMLSelectElement).value }); },
    }, h('option', { value: 'student', selected: s.role === 'student' }, 'student'), h('option', { value: 'admin', selected: s.role === 'admin' }, 'admin')))));

  /* ------------------------------ content ------------------------------ */
  const contentRows = UNITS.filter((u) => u.drafted).map((u) => h('tr', {},
    h('td', {}, h('a', { href: `#/unit/${u.id}` }, `Unit ${u.n}`), ' ', h('span', { class: 'muted small' }, u.title)),
    ...PARTS.map(([part]) => {
      const checked = state.status.get(`${u.id}:${part}`) === 'checked';
      const box = h('input', { type: 'checkbox', checked, 'aria-label': `${u.title}: ${part} checked` }) as HTMLInputElement;
      box.addEventListener('change', async () => {
        const status = box.checked ? 'checked' : 'draft';
        await api('PUT', '/api/admin/content-status', { unit_id: u.id, part, status });
        state.status.set(`${u.id}:${part}`, status);
      });
      return h('td', { style: 'text-align:center' }, box);
    })));

  mount(main, h('div', { class: 'stack', style: 'gap:24px' },
    h('h1', { class: 'serif', style: 'margin:0;font-size:34px' }, 'Admin'),
    h('div', { class: 'grid4', style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px' },
      ...tiles.map(([n, t]) => h('div', { class: 'panel' }, h('b', { class: 'serif', style: 'font-size:34px;display:block' }, String(n)), h('span', { class: 'small muted' }, t)))),

    h('section', { class: 'panel stack', style: 'gap:12px' },
      h('h2', { class: 'serif', style: 'font-size:24px' }, 'Invitations'),
      h('p', { class: 'small muted', style: 'margin:0' }, `Only @calvinseminary.edu Google accounts on this list can sign in. Always allowed: ${invites.admins.join(', ') || 'none'}.`),
      h('form', { class: 'row', onsubmit: (e: Event) => { e.preventDefault(); void invite(); } },
        inviteBox, h('button', { class: 'btn primary', type: 'submit' }, 'Invite'), inviteMsg),
      inviteRows.length ? h('div', { style: 'overflow-x:auto' }, h('table', { class: 'admin' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Address'), h('th', {}, 'Status'), h('th', {}, 'Added'), h('th', {}, ''))),
        h('tbody', {}, ...inviteRows))) : h('p', { class: 'muted' }, 'No invitations yet.')),

    h('section', { class: 'panel stack', style: 'gap:12px' },
      h('h2', { class: 'serif', style: 'font-size:24px' }, 'Students'),
      h('div', { style: 'overflow-x:auto' }, h('table', { class: 'admin' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Person'), h('th', {}, 'Last seen'), h('th', {}, 'Review, 7 days'), h('th', {}, 'Latest unit'),
          ...quizIds.map((q) => h('th', {}, q.toUpperCase())), h('th', {}, 'Role'))),
        h('tbody', {}, ...studentRows)))),

    h('section', { class: 'panel stack', style: 'gap:12px' },
      h('h2', { class: 'serif', style: 'font-size:24px' }, 'Content checked'),
      h('p', { class: 'small muted', style: 'margin:0' }, 'Students see a part of a unit only after it is ticked here (or on the unit page).'),
      h('div', { style: 'overflow-x:auto' }, h('table', { class: 'admin' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Unit'), ...PARTS.map(([, label]) => h('th', {}, label)))),
        h('tbody', {}, ...contentRows))))));
  return page;
}
