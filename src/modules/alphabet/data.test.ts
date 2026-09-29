/**
 * Sanity checks on the alphabet data, so a typo in data.ts is caught by
 * `npm test` instead of by a confused learner.
 */
import { describe, expect, it } from 'vitest';
import { transliterate } from '../../lib/greek';
import { CONFUSABLE_PAIRS, JOHN_1_1_5_WORDS, LETTERS, letterById } from './data';

describe('alphabet data', () => {
  it('has 24 letters, six per batch', () => {
    expect(LETTERS).toHaveLength(24);
    for (const b of [1, 2, 3, 4]) {
      expect(LETTERS.filter((l) => l.batch === b)).toHaveLength(6);
    }
  });

  it('uses unique ids and glyphs', () => {
    expect(new Set(LETTERS.map((l) => l.id)).size).toBe(24);
    expect(new Set(LETTERS.map((l) => l.lower)).size).toBe(24);
  });

  it('gives every example a transliteration that matches the rules', () => {
    for (const l of LETTERS) {
      expect(transliterate(l.example.greek), l.example.greek).toBe(l.example.translit);
    }
  });

  it('only pairs letters that exist', () => {
    for (const [a, b] of CONFUSABLE_PAIRS) {
      expect(() => letterById(a)).not.toThrow();
      expect(() => letterById(b)).not.toThrow();
    }
  });

  it('has John 1:1-5 words that transliterate to plain Latin', () => {
    for (const w of JOHN_1_1_5_WORDS) {
      expect(transliterate(w.greek)).toMatch(/^[a-zōē]+$/);
    }
  });
});
