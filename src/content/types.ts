/**
 * types.ts: the shape of a unit's teaching content ("lesson").
 *
 * One file per unit in src/content/lessons/ exports a Lesson. All wording is
 * our own (drafted by Claude, checked and edited by Eric), written to sit
 * beside Mounce's chapter, not to replace or reproduce it.
 */

/** A highlighted idea with an example, shown as a card on the unit page. */
export interface IdeaCard {
  /** Small caps label, e.g. 'Genitive · "of"'. */
  label: string;
  /** One or two plain sentences. */
  text: string;
  /** Optional Greek example and its translation. */
  greek?: string;
  english?: string;
}

/** A paradigm table. Every non-empty cell can become a review card. */
export interface Paradigm {
  /** Permanent id, used in card ids ('cell:art:3:1'). Never rename. */
  id: string;
  title: string;
  /** Column headers, excluding the first (row label) column. */
  columns: string[];
  rows: Array<{
    /** Row label, e.g. 'gen. sg.' */
    label: string;
    cells: string[];
    /** Highlight as new in this unit. */
    isNew?: boolean;
  }>;
  /** Shown under the table. */
  note?: string;
  /** Include its cells in review. Default true. */
  review?: boolean;
}

/** A multiple-choice question about an idea (not a form or a word). */
export interface Concept {
  id: string;
  q: string;
  /** Greek shown large under the question, if any. */
  greek?: string;
  options: string[];
  /** Index of the right option. */
  answer: number;
  /** Shown after answering: why that answer is right. */
  why: string;
}

export interface Lesson {
  unitId: string;
  /** "Before this page" checklist: what to do in Mounce and class first. */
  before: string[];
  ideas: {
    cards: IdeaCard[];
    points: string[];
    /** The classic mistake for this unit. */
    watch?: string;
  };
  paradigms: Paradigm[];
  concepts: Concept[];
  /** Extra pages in this app that belong to the unit (e.g. the alphabet drills). */
  links?: Array<{ href: string; label: string; text: string }>;
}
