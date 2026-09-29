/**
 * dom.ts: a tiny helper for building HTML elements in code, so the app needs
 * no framework (no React, no Vue). Each screen is a function that returns a
 * DOM element; re-rendering means calling it again and swapping the result.
 *
 *   h('button', { class: 'primary', onclick: go }, 'Start')
 *     -> <button class="primary">Start</button> with a click handler
 *
 * Rules:
 *   - attributes starting with "on" become event listeners,
 *   - `class`, `id`, `title`, `aria-*`, `data-*` etc. become attributes,
 *   - boolean `true` sets an empty attribute, `false`/`null`/`undefined` skip it,
 *   - children can be strings, numbers, elements, arrays, or null (skipped).
 * Strings are inserted as TEXT, never as HTML, so there is no injection risk.
 */

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'value' && 'value' in el) {
      (el as HTMLInputElement).value = String(value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  append(el, children);
  return el;
}

function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Replace everything inside `target` with `node`. */
export function mount(target: Element, node: Node): void {
  target.replaceChildren(node);
}

/** Fisher-Yates shuffle, returning a new array. */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick one item, favouring items with a higher weight. */
export function weightedPick<T>(items: T[], weight: (t: T) => number): T {
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
