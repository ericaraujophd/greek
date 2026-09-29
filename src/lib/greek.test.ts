/**
 * Unit tests for greek.ts. Run with:  npm test
 * The expected transliterations follow Mounce's scheme (BBG ch. 2).
 */
import { describe, expect, it } from 'vitest';
import {
  fixFinalSigma, keyToGreek, looseTranslit, stripMarks, transliterate,
} from './greek';

describe('stripMarks', () => {
  it('removes accents, breathings and subscripts', () => {
    expect(stripMarks('Ἀρχῇ')).toBe('αρχη');
    expect(stripMarks('ὁ λόγος')).toBe('ο λογος');
  });
});

describe('fixFinalSigma', () => {
  it('turns a word-final σ into ς', () => {
    expect(fixFinalSigma('λογοσ')).toBe('λογος');
    expect(fixFinalSigma('λογοσ και θεοσ.')).toBe('λογος και θεος.');
  });
  it('leaves a medial σ alone', () => {
    expect(fixFinalSigma('σκοτια')).toBe('σκοτια');
  });
});

describe('transliterate (Mounce scheme)', () => {
  const cases: Array<[string, string]> = [
    ['λόγος', 'logos'],
    ['ἀρχῇ', 'archē'],
    ['ὁ', 'ho'],
    ['οὗτος', 'houtos'],
    ['ἀνθρώπων', 'anthrōpōn'],
    ['ἄγγελος', 'angelos'],
    ['ῥῆμα', 'rhēma'],
    ['ψυχή', 'psuchē'],
    ['δι’', 'di'],
    ['Ἐν ἀρχῇ ἦν ὁ λόγος', 'en archē ēn ho logos'],
  ];
  it.each(cases)('%s -> %s', (greek, latin) => {
    expect(transliterate(greek)).toBe(latin);
  });
});

describe('looseTranslit', () => {
  it('ignores macrons, case and y/u', () => {
    expect(looseTranslit('Archē')).toBe(looseTranslit('arche'));
    expect(looseTranslit('psyche')).toBe(looseTranslit('psuchē'));
  });
});

describe('keyToGreek', () => {
  it('maps the standard Greek layout', () => {
    expect(keyToGreek('u')).toBe('θ');
    expect(keyToGreek('v')).toBe('ω');
    expect(keyToGreek('w')).toBe('ς');
    expect(keyToGreek('A')).toBe('Α');
    expect(keyToGreek('λ')).toBe('λ');
  });
});
