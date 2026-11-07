/** chapterNumbers reads every way units.ts writes chapters. */
import { describe, expect, it } from 'vitest';
import { chapterNumbers } from './videos';
import { UNITS } from './units';

describe('chapterNumbers', () => {
  it('reads ranges, pairs and halves', () => {
    expect(chapterNumbers('ch. 1 to 2')).toEqual([1, 2]);
    expect(chapterNumbers('ch. 5 and 6a')).toEqual([5, 6]);
    expect(chapterNumbers('ch. 7b')).toEqual([7]);
  });
  it('finds at least one chapter, between 1 and 21, for every unit', () => {
    for (const u of UNITS) {
      const ns = chapterNumbers(u.chapters);
      expect(ns.length, u.id).toBeGreaterThan(0);
      for (const n of ns) expect(n >= 1 && n <= 21, `${u.id}: ${n}`).toBe(true);
    }
  });
});
