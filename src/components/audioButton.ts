/**
 * audioButton.ts: play recorded pronunciations, record your own, and offer
 * yours as the shared one.
 *
 * WHY RECORDINGS
 *   Computer voices could not say Erasmian Greek properly (see the note in
 *   components/layout.ts), and no free, openly licensed word-by-word
 *   Erasmian audio exists. So pronunciations are recorded by people. One
 *   recording per KEY:
 *     word:<lemma>   e.g. word:λόγος       letter:<id>   e.g. letter:alpha
 *
 * TWO KINDS OF RECORDING
 *   Shared   one per key, heard by everyone (table `audio`). Admins record
 *            it directly. A student's recording becomes the shared one when
 *            an admin accepts their submission (Admin page, "Recordings").
 *   Mine     each person's private recording (table `audio_mine`), so a
 *            student can hear themselves next to the shared one.
 *
 * WHAT EACH PERSON SEES
 *   Admins     ▶ (if shared exists)  ● Record / ⋯ (record again, delete)
 *   Students   ▶ (if shared exists)  ● Me  → once recorded: ▶ Mine and a ⋯
 *              menu: record again, delete, "Offer as the shared recording".
 *              After offering: "Offered", then "Accepted" or "Not used".
 *
 * RECORDING
 *   1. The record button asks the browser for the microphone (the browser
 *      shows its own permission prompt the first time).
 *   2. Recording stops on "■ Stop", or by itself after 4 seconds.
 *   3. The take plays back at once; then Save, Redo or Cancel.
 *   4. Save uploads it (base64 inside JSON).
 *   The microphone is switched off as soon as recording stops.
 *   Browsers record in different formats (Chrome: webm/opus, Safari:
 *   mp4/aac); the format is stored with the audio.
 *
 * Audio is fetched only when someone presses play, then kept in memory for
 * the rest of the visit.
 */
import { h } from '../lib/dom';
import { api } from '../lib/api';
import { isAdmin, state } from '../lib/progress';

/** Recordings fetched this visit: "shared:key" or "mine:key" -> object URL. */
const cache = new Map<string, string>();
const MAX_MS = 4000;
const enc = encodeURIComponent;

type Which = 'shared' | 'mine';
const pathFor = (which: Which, key: string) => (which === 'shared' ? `/api/audio/${enc(key)}` : `/api/audio/mine/${enc(key)}`);

/** Turn base64 + type into a playable URL. */
export function clipUrl(mime: string, data: string): string {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

/** Fetch a recording (once per visit) and return a playable URL. */
async function urlFor(which: Which, key: string): Promise<string> {
  const id = `${which}:${key}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const { mime, data } = await api<{ mime: string; data: string }>('GET', pathFor(which, key));
  const url = clipUrl(mime, data);
  cache.set(id, url);
  return url;
}

/** Play a recording. Errors (no network, autoplay blocked) are ignored. */
export function play(url: string): void {
  void new Audio(url).play().catch(() => {});
}

/** Blob -> base64 (without the "data:...;base64," prefix). */
export function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * The control for one key. `label` is what is pronounced (for screen
 * readers and tooltips), e.g. "λόγος".
 */
export function audioButton(key: string, label: string): HTMLElement {
  const box = h('span', { class: 'audio-ctl' });
  const admin = isAdmin();
  draw();
  return box;

  /** A small button that does not trigger whatever it sits inside (e.g. a card). */
  function btn(text: string, cls: string, aria: string, fn: () => void, title = aria): HTMLElement {
    return h('button', { type: 'button', class: `btn small ${cls}`, 'aria-label': aria, title,
      onclick: (e: Event) => { e.stopPropagation(); fn(); } }, text);
  }

  function draw() {
    const parts: Node[] = [];
    const shared = state.audio.get(key);
    if (shared) {
      parts.push(btn('▶', 'play', `Play ${label}, recorded by ${shared.recorded_by}`,
        () => void urlFor('shared', key).then(play).catch(() => {})));
    }
    if (admin) {
      parts.push(shared
        ? menu(`Recording options for ${label}`, [
            btn('● Record again', '', `Record ${label} again`, () => void record('shared')),
            btn('Delete recording', '', `Delete the recording of ${label}`, removeShared)])
        : btn('● Record', 'rec', `Record ${label}`, () => void record('shared')));
    } else {
      const mine = state.myAudio.get(key);
      if (!mine) {
        parts.push(btn('● Me', 'rec', `Record yourself saying ${label}`, () => void record('mine'),
          'Record yourself, to compare (only you hear it)'));
      } else {
        parts.push(btn('▶ Mine', 'mine', `Play your recording of ${label}`, () => void urlFor('mine', key).then(play).catch(() => {})));
        const status = mine.submitted;
        parts.push(menu(`Your recording of ${label}`, [
          btn('● Record again', '', `Record yourself saying ${label} again`, () => void record('mine')),
          btn('Delete mine', '', `Delete your recording of ${label}`, removeMine),
          status === 'pending'
            ? h('span', { class: 'small muted' }, 'Offered; waiting for review')
            : btn('Offer as the shared recording', '', `Offer your recording of ${label} as the shared one`, submit),
        ]));
        if (status) parts.push(h('span', { class: `pill tiny ${status === 'accepted' ? 'good' : ''}` },
          status === 'pending' ? 'Offered' : status === 'accepted' ? 'Accepted' : 'Not used'));
      }
    }
    box.replaceChildren(...parts);
  }

  function menu(aria: string, items: Node[]): Node {
    return h('details', { class: 'audio-more' },
      h('summary', { title: aria, 'aria-label': aria, onclick: (e: Event) => e.stopPropagation() }, '⋯'),
      h('div', { class: 'audio-menu' }, ...items));
  }

  function flash(text: string) {
    box.replaceChildren(h('span', { class: 'small bad-text' }, text));
    setTimeout(draw, 3500);
  }

  async function removeShared() {
    if (!confirm(`Delete the recording of ${label}? Everyone will stop hearing it.`)) return;
    await api('DELETE', `/api/admin/audio/${enc(key)}`);
    state.audio.delete(key);
    cache.delete(`shared:${key}`);
    draw();
  }

  async function removeMine() {
    await api('DELETE', `/api/audio/mine/${enc(key)}`);
    state.myAudio.delete(key);
    cache.delete(`mine:${key}`);
    draw();
  }

  async function submit() {
    try {
      await api('POST', `/api/audio/mine/${enc(key)}/submit`, {});
      state.myAudio.set(key, { submitted: 'pending' });
      draw();
    } catch (err) { flash(`Not sent: ${(err as Error).message}`); }
  }

  /** Record a take, then review it (listen, save, redo, cancel). */
  async function record(which: Which) {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      flash('Microphone blocked. Allow it in the browser and try again.');
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
    const stop = btn('■ Stop', 'rec on', 'Stop recording', () => { if (rec.state === 'recording') rec.stop(); });
    box.replaceChildren(stop, h('span', { class: 'small muted' }, ` say ${label}`));
    const timer = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, MAX_MS);
    rec.onstop = () => {
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop()); // microphone off
      review(which, new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    };
    rec.start();
  }

  function review(which: Which, blob: Blob) {
    const url = URL.createObjectURL(blob);
    play(url);
    const compare = which === 'mine' && state.audio.has(key)
      ? btn('▶ Shared', '', `Play the shared recording of ${label}`, () => void urlFor('shared', key).then(play).catch(() => {}))
      : null;
    box.replaceChildren(
      btn('▶', '', 'Play this take', () => play(url)),
      ...(compare ? [compare] : []),
      btn('Save', 'primary', 'Save this take', async () => {
        box.replaceChildren(h('span', { class: 'small muted' }, 'Saving…'));
        try {
          const body = { mime: blob.type || 'audio/webm', data: await toBase64(blob) };
          if (which === 'shared') {
            const r = await api<{ recorded_by: string }>('PUT', `/api/admin/audio/${enc(key)}`, body);
            state.audio.set(key, { recorded_by: r.recorded_by });
          } else {
            await api('PUT', `/api/audio/mine/${enc(key)}`, body);
            state.myAudio.set(key, { submitted: null }); // a new take is not the one offered
          }
          cache.set(`${which}:${key}`, url);
          draw();
        } catch (err) { flash(`Not saved: ${(err as Error).message}`); }
      }),
      btn('Redo', '', 'Record again', () => { URL.revokeObjectURL(url); void record(which); }),
      btn('Cancel', '', 'Cancel', () => { URL.revokeObjectURL(url); draw(); }));
  }
}
