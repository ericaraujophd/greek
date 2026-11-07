/**
 * Question builders: right answers are where they say they are, and parse
 * questions never ask about a case before it is taught.
 */
import { describe, expect, it } from 'vitest';
import { parseIsRight, parseQuestions, practiceQuiz, unitCheck } from './questions';
import { unitById } from './units';

/** Deterministic random numbers, so failures are reproducible. */
function seeded(seed = 7) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

describe('unit checks', () => {
  for (const id of ['u01', 'u02', 'u03', 'u04', 'u05', 'u06', 'u07']) {
    it(`${id} builds up to 12 well-formed questions`, () => {
      const qs = unitCheck(id, seeded());
      expect(qs.length).toBeGreaterThan(3);
      expect(qs.length).toBeLessThanOrEqual(12);
      for (const q of qs) {
        if (q.kind === 'parse') expect(q.accepted.length).toBeGreaterThan(0);
        else expect(q.options[q.answer]).toBeDefined();
      }
    });
  }
});

describe('parse questions', () => {
  it('only asks nominative and accusative before chapter 7', () => {
    for (const q of parseQuestions(unitById('u05'), 30, seeded())) {
      if (q.kind !== 'parse') continue;
      for (const a of q.accepted) expect(['nominative', 'accusative']).toContain(a.case);
    }
  });

  it('accepts both readings of an ambiguous neuter form', () => {
    const q = parseQuestions(unitById('u07'), 400, seeded(3)).find((x) => x.kind === 'parse' && x.greek === 'ἔργα');
    expect(q).toBeDefined();
    if (q?.kind !== 'parse') return;
    expect(parseIsRight(q, { case: 'nominative', number: 'plural', gender: 'neuter' })).toBe(true);
    expect(parseIsRight(q, { case: 'accusative', number: 'plural', gender: 'neuter' })).toBe(true);
    expect(parseIsRight(q, { case: 'genitive', number: 'plural', gender: 'neuter' })).toBe(false);
  });
});

describe('practice quizzes', () => {
  it('builds Quiz 1 and Quiz 2 from drafted units', () => {
    expect(practiceQuiz('q1', seeded()).length).toBeGreaterThan(8);
    expect(practiceQuiz('q2', seeded()).length).toBe(20);
  });
});
