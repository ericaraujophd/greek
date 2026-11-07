/**
 * index.ts: every drafted lesson, looked up by unit id.
 * Units without an entry here show "content coming" on their page.
 */
import type { Lesson } from '../types';
import { U01, U02, U03 } from './foundations';
import { U04, U05, U06, U07 } from './nouns';

export const LESSONS: Record<string, Lesson> = Object.fromEntries(
  [U01, U02, U03, U04, U05, U06, U07].map((l) => [l.unitId, l]),
);

export function lessonFor(unitId: string): Lesson | undefined {
  return LESSONS[unitId];
}
