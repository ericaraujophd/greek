/**
 * audioButton.ts: play a recorded pronunciation, and (for admins) record it.
 *
 * WHY RECORDINGS
 *   Computer voices could not say Erasmian Greek properly (see the note in
 *   components/layout.ts), and no free, openly licensed word-by-word
 *   Erasmian audio exists. So pronunciations are recorded by a person (an
 *   admin) and shared with every user. One recording per key:
 *     word:<lemma>   e.g. word:λόγος       letter:<id>   e.g. letter:alpha
 *
 * WHAT EACH PERSON SEES
 *   Everyone:  ▶ when a recording exists (nothing when it does not).
 *   Admins:    ● Record when there is none; ▶ plus a small ⋯ menu
 *              (re-record, delete) when there is one.
 *
 * RECORDING (admins)
 *   1. "● Record" asks the browser for the microphone (the browser shows its
 *      own permission prompt the first time).
 *   2. Recording stops on "■ Stop", or by itself after 4 seconds.
 *   3. The take plays back at once; then Save, Redo or Cancel.
 *   4. Save uploads it (base64 in JSON) to /api/admin/audio/<key>.
 *   Browsers record in different formats (Chrome: webm/opus, Safari: mp4/aac);
 *   the format is stored with the audio and both play everywhere current.
 *
 * Audio is fetched only when someone presses play, then kept in memory for
 * the rest of the visit.
 */
import { h } from '../lib/dom';
import { api } from '../lib/api';
import { isAdmin, state } from '../lib/progress';

/** Recordings fetched this visit: key -> object URL. */
const cache = new Map<string, string>();
const MAX_MS = 4000;

/** Fetch a recording (once) and return a playable URL. */
async function urlFor(key: string): Promise<string> {
  const hit = cache.get(key);
  if (hit) return hit;
  const { mime, data } = await api<{ mime: string; data: string }>('GET', `/api/audio/${encodeURIComponent(key)}`);
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  cache.set(key, url);
  return url;
}

/** Play the recording for a key. */
export async function playRecording(key: string): Promise<void> {
  const audio = new Audio(await urlFor(key));
  await audio.play();
}

/** Blob -> base64 (without the "data:...;base64," prefix). */
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * The control for one key. `label` is what is pronounced (for screen
 * readers and the tooltip), e.g. "λόγος".
 */
export function audioButton(key: string, label: string): HTMLElement {
  const box = h('span', { class: 'audio-ctl' });
  draw();
  return box;

  function draw() {
    const has = state.audio.has(key);
    const parts: Node[] = [];
    if (has) {
      const who = state.audio.get(key)!.recorded_by;
      parts.push(h('button', {
        type: 'button', class: 'btn small play', title: `Play (recorded by ${who})`, 'aria-label': `Play ${label}, recorded by ${who}`,
        onclick: (e: Event) => { e.stopPropagation(); void playRecording(key).catch(() => { /* ignore a failed play */ }); },
      }, '▶'));
    }
    if (isAdmin()) {
      parts.push(has
        ? h('details', { class: 'audio-more' },
            h('summary', { title: 'Recording options', 'aria-label': `Recording options for ${label}` }, '⋯'),
            h('div', { class: 'audio-menu' },
              h('button', { type: 'button', class: 'btn small', onclick: startRecording }, '● Record again'),
              h('button', { type: 'button', class: 'btn small', onclick: remove }, 'Delete recording')))
        : h('button', { type: 'button', class: 'btn small rec', title: `Record ${label}`, 'aria-label': `Record ${label}`, onclick: startRecording }, '● Record'));
    }
    box.replaceChildren(...parts);
  }

  async function remove() {
    if (!confirm(`Delete the recording of ${label}? Everyone will stop hearing it.`)) return;
    await api('DELETE', `/api/admin/audio/${encodeURIComponent(key)}`);
    state.audio.delete(key);
    cache.delete(key);
    draw();
  }

  async function startRecording(e?: Event) {
    e?.stopPropagation();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      box.replaceChildren(h('span', { class: 'small bad-text' }, 'Microphone blocked. Allow it in the browser and try again.'));
      setTimeout(draw, 3500);
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
    const stop = h('button', { type: 'button', class: 'btn small rec on', 'aria-label': 'Stop recording' }, '■ Stop');
    stop.addEventListener('click', (ev) => { ev.stopPropagation(); if (rec.state === 'recording') rec.stop(); });
    box.replaceChildren(stop, h('span', { class: 'small muted' }, ` say ${label}`));
    const timer = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, MAX_MS);
    rec.onstop = () => {
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop()); // turn the microphone off
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      review(blob);
    };
    rec.start();
  }

  /** Play the take back and offer Save / Redo / Cancel. */
  function review(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const listen = () => void new Audio(url).play().catch(() => {});
    listen();
    const btn = (text: string, cls: string, fn: () => void) =>
      h('button', { type: 'button', class: `btn small ${cls}`, onclick: (e: Event) => { e.stopPropagation(); fn(); } }, text);
    box.replaceChildren(
      btn('▶', '', listen),
      btn('Save', 'primary', async () => {
        box.replaceChildren(h('span', { class: 'small muted' }, 'Saving…'));
        try {
          const data = await toBase64(blob);
          const r = await api<{ recorded_by: string }>('PUT', `/api/admin/audio/${encodeURIComponent(key)}`, { mime: blob.type || 'audio/webm', data });
          state.audio.set(key, { recorded_by: r.recorded_by });
          cache.set(key, url);
          draw();
        } catch (err) {
          box.replaceChildren(h('span', { class: 'small bad-text' }, `Not saved: ${(err as Error).message}`));
          setTimeout(draw, 3500);
        }
      }),
      btn('Redo', '', () => { URL.revokeObjectURL(url); void startRecording(); }),
      btn('Cancel', '', () => { URL.revokeObjectURL(url); draw(); }));
  }
}
