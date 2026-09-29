/**
 * cards.ts: the alphabet flashcard deck and the rules for what to study next.
 *
 * THREE CARDS PER LETTER (72 in total)
 *   read     front: λ          back: lambda, "l as in law", transliterated l
 *   write    front: "lambda"   back: λ Λ   (picture or write it, then check)
 *   capital  front: Λ          back: λ lambda
 * Reading is what you will do most, so it comes first; writing forces you
 * to recall the shape; capitals are rarer in the NT (names, sentence starts),
 * so they come last within each letter.
 *
 * BATCHES UNLOCK THEMSELVES
 *   Batch 1 (α to ζ) is always open. The next batch opens once every card in
 *   the previous batch has "graduated" (FSRS state Review = you have
 *   recalled it on at least two separate occasions). Nothing to click, and
 *   you never face 24 unfamiliar letters at once.
 *
 * CARD IDS look like "alpha:lambda:read". They are saved in progress.json,
 * so never rename them.
 */
import { getProgress } from '../../lib/store';
import { isDue, isNew, newCard, type StoredCard } from '../../lib/srs';
import { getSettings } from '../../lib/settings';
import { LETTERS, letterById, type Letter } from './data';

export type CardKind = 'read' | 'write' | 'capital';
export const CARD_KINDS: CardKind[] = ['read', 'write', 'capital'];

export interface AlphaCard {
  id: string;
  letter: Letter;
  kind: CardKind;
}

export function cardId(letterId: string, kind: CardKind): string {
  return `alpha:${letterId}:${kind}`;
}

export function parseCardId(id: string): AlphaCard {
  const [, letterId, kind] = id.split(':');
  return { id, letter: letterById(letterId), kind: kind as CardKind };
}

/** All 72 alphabet cards, in teaching order. */
export function allCards(): AlphaCard[] {
  return LETTERS.flatMap((letter) => CARD_KINDS.map((kind) => ({ id: cardId(letter.id, kind), letter, kind })));
}

/** The saved schedule for a card, or a fresh one if it was never studied. */
export function scheduleOf(id: string): StoredCard {
  return getProgress().cards[id] ?? newCard();
}

/** Has every card of this batch graduated (FSRS state 2 = Review)? */
function batchGraduated(batch: number): boolean {
  return allCards()
    .filter((c) => c.letter.batch === batch)
    .every((c) => (getProgress().cards[c.id]?.state ?? 0) === 2);
}

/** Highest batch currently open, from 1 to 4. */
export function unlockedBatch(): number {
  let b = 1;
  while (b < 4 && batchGraduated(b)) b++;
  return b;
}

/** Letters in the open batches: "the letters you have met". */
export function metLetters(): Letter[] {
  const top = unlockedBatch();
  return LETTERS.filter((l) => l.batch <= top);
}

/** How many brand-new cards were introduced today (local date). */
function introducedToday(): number {
  const today = new Date().toDateString();
  return Object.values(getProgress().cards)
    .filter((c) => c.introduced && new Date(c.introduced).toDateString() === today).length;
}

/**
 * Today's queue: every due card that has been studied before (oldest due
 * first), then new cards from the open batches, up to the daily limit.
 * Reviews come first because keeping old letters is worth more than adding
 * new ones.
 */
export function buildQueue(now = new Date()): AlphaCard[] {
  const top = unlockedBatch();
  const cards = allCards().filter((c) => c.letter.batch <= top);

  // Cards still in the short "learning" steps (state 1 or 3, due again in a
  // minute or ten) are shown up to 20 minutes early, like Anki's "learn ahead
  // limit", so a session never stalls waiting for a timer.
  // Those early cards go at the END of the queue, after new cards, so you
  // meet the next new letter before seeing the one you just rated again.
  const learnAhead = new Date(now.getTime() + 20 * 60 * 1000);
  const byDue = (a: AlphaCard, b: AlphaCard) => scheduleOf(a.id).due.localeCompare(scheduleOf(b.id).due);
  const studied = cards.filter((c) => { const s = getProgress().cards[c.id]; return s && !isNew(s); });

  const dueNow = studied.filter((c) => isDue(scheduleOf(c.id), now)).sort(byDue);
  const early = studied
    .filter((c) => { const s = scheduleOf(c.id); return (s.state === 1 || s.state === 3) && !isDue(s, now) && isDue(s, learnAhead); })
    .sort(byDue);

  const newAllowance = Math.max(0, getSettings().newPerDay - introducedToday());
  const fresh = cards.filter((c) => isNew(scheduleOf(c.id))).slice(0, newAllowance);

  return [...dueNow, ...fresh, ...early];
}

/** Summary numbers for the home and alphabet screens. */
export function deckSummary(now = new Date()) {
  const cards = allCards();
  const saved = (id: string) => getProgress().cards[id];
  const learned = cards.filter((c) => (saved(c.id)?.state ?? 0) === 2).length;
  const due = cards.filter((c) => { const s = saved(c.id); return s && !isNew(s) && isDue(s, now); }).length;
  return { total: cards.length, learned, due, queue: buildQueue(now).length, batch: unlockedBatch() };
}
