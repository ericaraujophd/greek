/**
 * logo.ts: the Greek Companion mark.
 *
 * A rounded square in a navy gradient with a thin saffron border, and an α
 * drawn as one stroke: a ring (the bowl of the letter) plus a curved tail,
 * with a small cobalt dot as an accent. The same drawing is in
 * public/icon.svg (browser tab and home-screen icon); if you change one,
 * change the other.
 *
 * SVG is built as a string because the h() helper creates HTML elements, and
 * SVG needs its own namespace. The string is fixed (no user input in it), so
 * innerHTML is safe here.
 */
let uid = 0;

export function logoMark(size = 40): HTMLElement {
  // Each copy needs its own gradient id, or two logos on one page would share one.
  const id = `lg${++uid}`;
  const span = document.createElement('span');
  span.className = 'logo-mark';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#24397a"/><stop offset="1" stop-color="#0f1b3d"/></linearGradient></defs>
  <rect x="1" y="1" width="62" height="62" rx="18" fill="url(#${id})" stroke="rgba(255,197,61,.45)" stroke-width="1.5"/>
  <circle cx="27" cy="34" r="10.5" fill="none" stroke="#ffc53d" stroke-width="4.5"/>
  <path d="M41 19 C 37 33, 38 44, 46 46" fill="none" stroke="#ffc53d" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="47" cy="17" r="2.6" fill="#7fa0ff"/>
</svg>`;
  return span;
}
