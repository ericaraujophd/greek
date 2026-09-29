/**
 * settings.ts (view): GitHub sync setup, daily limits, backup and reset.
 *
 * The step-by-step token instructions are on the page itself, because this
 * is set up once per device and nobody remembers how a year later.
 */
import { h, mount } from '../lib/dom';
import { getSettings, saveSettings, syncConfigured } from '../lib/settings';
import { emptyProgress, getProgress, mergeProgress, replaceProgress, resetLocal, type Progress } from '../lib/store';
import { getSyncStatus, pull, push } from '../lib/sync';

export function settingsView(): Node {
  const s = getSettings();
  const status = h('div', { class: 'small-text', style: 'min-height:22px' });

  // autocomplete 'new-password' (+ the 1Password/LastPass opt-outs) stops the
  // browser's password manager from filling the token box with your saved
  // GitHub *password*, which GitHub then rejects with a 401.
  const field = (label: string, name: keyof typeof s, help: string, type = 'text') =>
    h('label', {}, label,
      h('input', {
        name, type, value: String(s[name]), spellcheck: 'false',
        autocomplete: type === 'password' ? 'new-password' : 'off',
        'data-1p-ignore': true, 'data-lpignore': 'true',
      }),
      h('small', {}, help));

  const form = h('form', {
    class: 'settings',
    onsubmit: async (e: Event) => {
      e.preventDefault();
      const data = new FormData(form);
      saveSettings({
        owner: String(data.get('owner')).trim(),
        repo: String(data.get('repo')).trim(),
        token: String(data.get('token')).trim(),
        newPerDay: Math.max(0, Number(data.get('newPerDay')) || 18),
        autoSpeak: data.get('autoSpeak') === 'on',
      });
      if (!syncConfigured()) { status.textContent = 'Saved. Sync stays off until owner, repo and token are all filled in.'; return; }
      // Fine-grained tokens start with "github_pat_", classic ones with "ghp_".
      // Anything else is almost certainly a password or a partial copy.
      const token = getSettings().token;
      if (!/^(github_pat_|ghp_)/.test(token)) {
        status.textContent = `That does not look like a GitHub token (it should start with "github_pat_"). Clear the box and paste the token again.`;
        return;
      }
      status.textContent = 'Saved. Testing the connection…';
      await pull();
      const st = getSyncStatus();
      status.textContent = st.kind === 'error' ? st.message : 'Connected. Progress loaded from GitHub.';
    },
  },
    field('GitHub account', 'owner', 'The account that owns the progress repo.'),
    field('Progress repo', 'repo', 'A private repo that holds progress.json.'),
    field('Access token', 'token', 'Fine-grained token, stored only in this browser.', 'password'),
    field('New flashcards per day', 'newPerDay', '18 = one batch of six letters (three cards each) per day.', 'number'),
    h('label', { style: 'display:flex;gap:8px;align-items:center;font-weight:600' },
      h('input', { type: 'checkbox', name: 'autoSpeak', checked: s.autoSpeak }),
      'Read letters aloud when a flashcard is turned over'),
    h('div', { class: 'row' },
      h('button', { class: 'primary', type: 'submit' }, 'Save and test'),
      h('button', { type: 'button', onclick: () => void push('Manual save') }, 'Save progress to GitHub now')),
    status,
  );

  return h('div', {},
    h('h1', {}, 'Settings'),
    h('p', { class: 'lead' }, 'Everything on this page stays in this browser. Only progress.json goes to GitHub.'),

    h('h2', {}, 'GitHub sync'),
    form,

    h('h2', {}, 'Setting up sync on a new device'),
    h('ol', { class: 'steps' },
      h('li', {}, 'The private repo ', h('code', {}, 'greek-progress'), ' already exists (created with the app). Nothing to do.'),
      h('li', {}, 'Open ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'GitHub > Settings > Fine-grained tokens > Generate new token'), '.'),
      h('li', {}, 'Name it after the device ("greek iPad"). Pick an expiration (a year is reasonable).'),
      h('li', {}, 'Repository access: ', h('b', {}, 'Only select repositories'), ', and choose ', h('code', {}, 'greek-progress'), '.'),
      h('li', {}, 'Permissions > Repository permissions > ', h('b', {}, 'Contents: Read and write'), '. Leave everything else as "No access".'),
      h('li', {}, 'Generate, copy the token, paste it above, and press Save and test.'),
      h('li', {}, 'If a device is lost, delete its token on GitHub. The worst a leaked token can do is edit progress.json.'),
    ),

    h('h2', {}, 'Backup'),
    h('p', { class: 'muted small-text' }, 'Download a copy of your progress, or merge a copy back in (nothing is overwritten; the merge keeps the newest of everything).'),
    backupRow(),

    h('h2', {}, 'Reset'),
    h('p', { class: 'muted small-text' }, 'Clears progress on this device only. The GitHub copy is untouched and comes back on the next sync.'),
    resetRow(),
  );
}

function backupRow(): Node {
  const msg = h('span', { class: 'small-text muted' });
  const fileInput = h('input', { type: 'file', accept: 'application/json', style: 'display:none' }) as HTMLInputElement;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const incoming = JSON.parse(await file.text()) as Progress;
      replaceProgress(mergeProgress(getProgress(), { ...emptyProgress(), ...incoming }), true);
      msg.textContent = 'Merged.';
    } catch {
      msg.textContent = 'That file is not a progress backup.';
    }
  });
  const download = () => {
    const blob = new Blob([JSON.stringify(getProgress(), null, 1)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `greek-progress-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
  };
  return h('div', { class: 'row' },
    h('button', { type: 'button', onclick: download }, 'Download progress'),
    h('button', { type: 'button', onclick: () => fileInput.click() }, 'Merge a backup'),
    fileInput, msg);
}

function resetRow(): Node {
  const slot = h('div', {});
  const ask = () => mount(slot, h('div', { class: 'row' },
    h('span', { class: 'small-text' }, 'Really clear this device?'),
    h('button', { class: 'small', onclick: () => { resetLocal(); mount(slot, h('span', { class: 'small-text muted' }, 'Cleared.')); } }, 'Yes, clear'),
    h('button', { class: 'small', onclick: show }, 'Cancel')));
  const show = () => mount(slot, h('button', { type: 'button', onclick: ask }, 'Clear local progress'));
  show();
  return slot;
}
