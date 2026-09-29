/**
 * srs.ts: spaced repetition, built on the FSRS algorithm (the same one
 * Anki now uses by default), via the `ts-fsrs` library.
 *
 * WHAT SPACED REPETITION DOES
 *   Each flashcard has a due date. When you review a card you rate how well
 *   you remembered it (Again / Hard / Good / Easy). FSRS uses the rating and
 *   the card's history to predict when you are about to forget it, and
 *   schedules the next review just before that point. Easy cards drift out to
 *   weeks and months; hard ones come back tomorrow.
 *
 * WHY THIS WRAPPER EXISTS
 *   ts-fsrs cards contain JavaScript Date objects. Progress is stored as JSON
 *   (in the browser and in the GitHub repo), and JSON has no Date type, so
 *   dates become strings. `toStored` / `fromStored` convert in both
 *   directions, and every other file only ever sees the StoredCard shape.
 */
import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs';

export { Rating };
export type { Grade };

/** A card as saved in JSON: identical to ts-fsrs's Card, dates as ISO strings. */
export interface StoredCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  /** 0 = New, 1 = Learning, 2 = Review, 3 = Relearning */
  state: number;
  last_review?: string;
  /**
   * When THIS copy of the card last changed (ISO time). Used by the sync
   * merge: if two devices both reviewed a card, the newer change wins.
   */
  updatedAt: string;
  /**
   * When the card was first reviewed (ISO time). Used to enforce the
   * "new cards per day" limit. Absent on cards never reviewed.
   */
  introduced?: string;
}

/**
 * One shared scheduler. `request_retention: 0.9` means "schedule each card
 * so I have a 90% chance of remembering it when it comes due", FSRS's
 * recommended default. `enable_fuzz` spreads due dates by a few percent so
 * cards learned together do not all come back on the same day.
 */
const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: true });

/** A brand-new card, due now. */
export function newCard(now = new Date()): StoredCard {
  return toStored(createEmptyCard(now), now);
}

/** Apply a rating and return the updated card. */
export function review(card: StoredCard, grade: Grade, now = new Date()): StoredCard {
  const result = scheduler.next(fromStored(card), now, grade);
  return { ...toStored(result.card, now), introduced: card.introduced ?? now.toISOString() };
}

/**
 * Human-friendly preview of when the card would come back for each rating,
 * shown on the rating buttons ("Good · 3d").
 */
export function previewIntervals(card: StoredCard, now = new Date()): Record<Grade, string> {
  const preview = scheduler.repeat(fromStored(card), now);
  const label = (g: Grade) => formatInterval(preview[g].card.due.getTime() - now.getTime());
  return {
    [Rating.Again]: label(Rating.Again),
    [Rating.Hard]: label(Rating.Hard),
    [Rating.Good]: label(Rating.Good),
    [Rating.Easy]: label(Rating.Easy),
  } as Record<Grade, string>;
}

/** Is the card due for review at `now`? */
export function isDue(card: StoredCard, now = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}

/** True for cards that have never been reviewed. */
export function isNew(card: StoredCard): boolean {
  return card.state === 0;
}

/* ------------------------------ helpers ------------------------------ */

function toStored(card: Card, now: Date): StoredCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : undefined,
    updatedAt: now.toISOString(),
  };
}

function fromStored(s: StoredCard): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsed_days,
    scheduled_days: s.scheduled_days,
    learning_steps: s.learning_steps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  } as Card;
}

/** 90 000 ms -> "2m", 3 days -> "3d", etc. */
export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min}m`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  return `${(days / 365).toFixed(1)}y`;
}
