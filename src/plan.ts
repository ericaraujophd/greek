/**
 * plan.ts: the 47-week study plan (the "Koine Greek Self-Study Plan" doc),
 * so the home screen can say what this week is about.
 *
 * Week 1 starts Tuesday 29 September 2026. Sessions are Tuesday, Thursday
 * and Saturday, 30 minutes each. If the plan in the doc changes, update
 * this list to match.
 */

export const PLAN_START = new Date(2026, 8, 29); // months are 0-based: 8 = September
export const STUDY_DAYS = [2, 4, 6]; // Tue, Thu, Sat (0 = Sunday)

/** Short label per week, index 0 = week 1. */
export const WEEKS: string[] = [
  'Ch. 1 to 2: alphabet and pronunciation',
  'Ch. 3 to 4: breathings, accents, syllables',
  'Ch. 5: English grammar review, nouns', 'Ch. 5 then 6: the article', 'Ch. 6: nominative and accusative',
  'Ch. 7: genitive and dative', 'Ch. 7 then 8: prepositions, εἰμί', 'Ch. 8: prepositions, εἰμί',
  'Ch. 9: adjectives', 'Ch. 9 then 10: third declension', 'Ch. 10: third declension',
  'Review: ch. 5 to 10', 'Off: Christmas', 'Off: New Year',
  'Ch. 11: personal pronouns', 'Ch. 11 then 12: αὐτός', 'Ch. 12: αὐτός',
  'Ch. 13: demonstratives', 'Ch. 13 then 14: relative pronoun', 'Ch. 14: relative pronoun',
  'Ch. 15: introduction to verbs', 'Ch. 15: introduction to verbs',
  'Ch. 16: present active', 'Ch. 16: present active', 'Ch. 17: contract verbs', 'Ch. 17: contract verbs',
  'Ch. 18: present middle and passive', 'Ch. 18: present middle and passive',
  'Ch. 19: future active and middle', 'Ch. 19: future active and middle',
  'Ch. 20: verbal roots', 'Ch. 20: verbal roots', 'Ch. 21: imperfect', 'Ch. 21: imperfect',
  'Ch. 22: second aorist', 'Ch. 22: second aorist', 'Ch. 23: first aorist', 'Ch. 23: first aorist',
  'Ch. 24: aorist and future passive', 'Ch. 24: aorist and future passive',
  'Ch. 25: perfect', 'Ch. 25: perfect', 'Review: John 1:1 to 18',
  'Buffer', 'Buffer', 'Buffer', 'Buffer',
];

/** Plan week for a date: 0 before the start, 1 to 47 during, 48+ after. */
export function planWeek(date = new Date()): number {
  const ms = date.getTime() - PLAN_START.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (7 * 24 * 3600 * 1000)) + 1;
}

export function isStudyDay(date = new Date()): boolean {
  return STUDY_DAYS.includes(date.getDay());
}
