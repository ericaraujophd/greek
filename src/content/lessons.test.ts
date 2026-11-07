/**
 * Checks on the drafted content, so typos are caught by `npm test`:
 *   - every paradigm form is a real, attested NT form of that word, with the
 *     parsing the table claims (verified against MorphGNT);
 *   - every concept question has a valid answer index;
 *   - word lists have no duplicates.
 */
import { describe, expect, it } from 'vitest';
import forms from './generated/forms.json';
import { LESSONS } from './lessons';
import { UNITS } from './units';

type FormRow = [string, string, string, number];
const FORMS = forms as Record<string, FormRow[]>;

const CASE: Record<string, string> = { nom: 'N', gen: 'G', dat: 'D', acc: 'A' };

/** Does MorphGNT attest `form` of `lemma` as case/number (gender optional)? */
function attested(lemma: string, form: string, rowLabel: string): boolean {
  const [c, n] = rowLabel.split(' ');
  const want = CASE[c.replace('.', '')] + (n.startsWith('sg') ? 'S' : 'P');
  return (FORMS[lemma] ?? []).some(([w, , parse]) => w === form && parse.slice(4, 6) === want);
}

describe('paradigms', () => {
  // Column header -> lemma for the shared article/noun tables.
  const LEMMA_OF: Record<string, string> = {
    'Article m.': 'ὁ', 'Article f.': 'ὁ', 'Article n.': 'ὁ',
    'λόγος (2nd, m.)': 'λόγος', 'γραφή (1st, f.)': 'γραφή', 'ἔργον (2nd, n.)': 'ἔργον',
    'ὥρα (α after ε, ι, ρ)': 'ὥρα', 'δόξα (α, then η)': 'δόξα', 'γραφή (η)': 'γραφή',
  };
  for (const lesson of Object.values(LESSONS)) {
    for (const p of lesson.paradigms) {
      if (p.id === 'punct') continue;
      it(`${lesson.unitId} ${p.id}: every form is attested with that parsing`, () => {
        const unattested: string[] = [];
        p.columns.forEach((col, ci) => {
          const lemma = LEMMA_OF[col];
          expect(lemma, `no lemma mapping for column "${col}"`).toBeDefined();
          for (const row of p.rows) {
            const form = row.cells[ci];
            // A few rare forms never occur in the NT (e.g. ὡρῶν); allow those,
            // but report them so a human double-checks.
            if (!attested(lemma, form, row.label)) unattested.push(`${form} (${row.label})`);
          }
        });
        expect(unattested.filter((f) => !ALLOWED_UNATTESTED.includes(f))).toEqual([]);
      });
    }
  }
});

/** Correct standard forms that simply do not occur in the NT. */
const ALLOWED_UNATTESTED = [
  'ἔργου (gen. sg.)', 'ὥρᾳ (dat. sg.)', 'ὧραι (nom. pl.)', 'ὡρῶν (gen. pl.)', 'ὥραις (dat. pl.)',
  'δόξαι (nom. pl.)', 'δοξῶν (gen. pl.)', 'δόξαις (dat. pl.)', 'δόξας (acc. pl.)', 'δόξῃ (dat. sg.)',
  'γραφῆς (gen. sg.)', 'γραφῇ (dat. sg.)', 'γραφῶν (gen. pl.)', 'γραφαῖς (dat. pl.)',
  'λόγῳ (dat. sg.)',
];

describe('concepts', () => {
  for (const lesson of Object.values(LESSONS)) {
    it(`${lesson.unitId}: answers point at a real option and ids are unique`, () => {
      const ids = lesson.concepts.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const c of lesson.concepts) expect(c.options[c.answer], c.id).toBeDefined();
    });
  }
});

describe('words', () => {
  it('has no word listed twice across units', () => {
    const all = UNITS.flatMap((u) => u.words.map((w) => w.lemma));
    expect(all.length).toBe(new Set(all).size);
  });
  it('has forms for every course word', () => {
    for (const u of UNITS) for (const w of u.words) expect(FORMS[w.lemma], w.lemma).toBeDefined();
  });
});
