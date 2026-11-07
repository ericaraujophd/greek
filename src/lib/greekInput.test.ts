/**
 * Tests for greekInput.ts: marks combine into the same characters the
 * Greek New Testament uses, final sigma, and accent-insensitive search.
 */
import { describe, expect, it } from 'vitest';
import { plain, withMark } from './greekInput';

describe('withMark', () => {
  it('adds an acute accent', () => expect(withMark('α', 'acute')).toBe('ά'));
  it('stacks breathing and accent in the standard order', () => {
    expect(withMark(withMark('α', 'smooth'), 'acute')).toBe('ἄ');
    expect(withMark(withMark('α', 'acute'), 'smooth')).toBe('ἄ'); // order typed does not matter
  });
  it('adds an iota subscript under a circumflex', () => expect(withMark(withMark('ω', 'circumflex'), 'iota')).toBe('ῷ'));
  it('replaces one accent with another', () => expect(withMark('ά', 'grave')).toBe('ὰ'));
  it('replaces one breathing with another', () => expect(withMark('ἀ', 'rough')).toBe('ἁ'));
  it('removes a mark typed twice', () => expect(withMark('ά', 'acute')).toBe('α'));
  it('leaves Latin letters alone', () => expect(withMark('a', 'acute')).toBe('a'));
  it('rough breathing on a capital', () => expect(withMark('Ο', 'rough')).toBe('Ὁ'));
});

describe('plain', () => {
  it('ignores accents, breathings, case and final sigma', () => {
    expect(plain('Λόγος')).toBe('λογοσ');
    expect(plain('τῷ')).toBe('τω');
    expect(plain('ἁμαρτία')).toBe('αμαρτια');
  });
});
