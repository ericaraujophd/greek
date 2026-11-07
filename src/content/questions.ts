/**
 * questions.ts: build practice questions from the course content.
 *
 * Used by three places:
 *   - the unit page's practice check (12 questions on that unit),
 *   - practice quizzes before each class quiz (20 questions across units),
 *   - the daily review (parse questions mixed in with flashcards).
 *
 * QUESTION KINDS
 *   concept  a written multiple-choice question from the lesson file
 *   meaning  Greek word -> English gloss (4 choices, distractors from the
 *            same and earlier units)
 *   cell     "dat. pl. of λόγος?" -> pick the form (choices from the same
 *            paradigm column, so they are all plausible)
 *   parse    a REAL New Testament form (from MorphGNT) -> case, number and
 *            gender. Only cases already taught are asked. If the same
 *            spelling has more than one possible parsing (ἔργα = nom. or acc.
 *            pl.; ὥρας = gen. sg. or acc. pl.), every possible answer counts
 *            as right, exactly as on a class quiz.
 *   letter   a Greek letter -> its name (unit 2 only)
 *
 * Every question has an item id, which is what the answer log records and
 * what "weak items" are computed from.
 */
import forms from './generated/forms.json';
import lexicon from './generated/lexicon.json';
import { LESSONS } from './lessons';
import { UNITS, QUIZZES, unitById, wordsThrough, type Unit, type Word } from './units';
import { LETTERS } from '../modules/alphabet/data';

type FormRow = [string, string, string, number];
const FORMS = forms as unknown as Record<string, FormRow[]>;
export const LEXICON = lexicon as Record<string, { f: number; g: string }>;

export interface ParseAnswer { case: string; number: string; gender: string }

export type Question =
  | { kind: 'concept' | 'meaning' | 'cell' | 'letter'; itemId: string; prompt: string; greek?: string; options: string[]; answer: number; why: string }
  | { kind: 'parse'; itemId: string; prompt: string; greek: string; lemma: string; gloss: string; accepted: ParseAnswer[]; cases: string[]; why: string };

/* ------------------------------ helpers ------------------------------ */

export function shuffle<T>(a: T[], rand = Math.random): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

/** Put the right answer among the distractors and remember where it went. */
function choice(right: string, wrong: string[], rand = Math.random) {
  const options = shuffle([right, ...shuffle(wrong.filter((w) => w !== right), rand).slice(0, 3)], rand);
  return { options, answer: options.indexOf(right) };
}

const CASE_NAME: Record<string, string> = { N: 'nominative', G: 'genitive', D: 'dative', A: 'accusative', V: 'vocative' };
const NUM_NAME: Record<string, string> = { S: 'singular', P: 'plural' };
const GEN_NAME: Record<string, string> = { M: 'masculine', F: 'feminine', N: 'neuter' };

export function parseLabel(p: ParseAnswer): string {
  return `${p.case.slice(0, 3)}. ${p.number === 'singular' ? 'sg' : 'pl'}. ${p.gender.slice(0, 4)}.`;
}

/** Cases a student can be asked about after a unit. */
export function casesTaught(unit: Unit): string[] {
  const out: string[] = [];
  if (unit.grammar.includes('nom')) out.push('nominative');
  if (unit.grammar.includes('gen')) out.push('genitive');
  if (unit.grammar.includes('dat')) out.push('dative');
  if (unit.grammar.includes('acc')) out.push('accusative');
  return out;
}

/* ------------------------------ builders ------------------------------ */

export function conceptQuestions(unitId: string): Question[] {
  return (LESSONS[unitId]?.concepts ?? []).map((c) => ({
    kind: 'concept' as const, itemId: `concept:${unitId}:${c.id}`, prompt: c.q, greek: c.greek,
    options: c.options, answer: c.answer, why: c.why,
  }));
}

export function meaningQuestion(w: Word, pool: Word[], rand = Math.random): Question {
  const { options, answer } = choice(w.gloss, pool.map((p) => p.gloss), rand);
  return {
    kind: 'meaning', itemId: `word:${w.lemma}`, prompt: 'What does this word mean?', greek: w.display ?? w.lemma,
    options, answer, why: `${w.display ?? w.lemma} means "${w.gloss}".${w.note ? ' ' + w.note + '.' : ''}`,
  };
}

/** All paradigm cells available through a unit, as cell questions. */
export function cellQuestions(throughUnit: number, rand = Math.random): Question[] {
  const out: Question[] = [];
  for (const u of UNITS.filter((x) => x.n <= throughUnit)) {
    for (const p of LESSONS[u.id]?.paradigms ?? []) {
      if (p.review === false || p.id === 'punct') continue;
      p.columns.forEach((col, ci) => {
        const column = p.rows.map((r) => r.cells[ci]);
        p.rows.forEach((row, ri) => {
          const right = row.cells[ci];
          const others = [...new Set(column.filter((f) => f !== right))];
          if (others.length < 3) return;
          const { options, answer } = choice(right, others, rand);
          out.push({
            kind: 'cell', itemId: `cell:${p.id}:${ri}:${ci}`, prompt: `${row.label} of ${col.replace(/ \(.*\)/, '')}?`,
            options, answer, why: `${col.replace(/ \(.*\)/, '')}, ${row.label}: ${right}`,
          });
        });
      });
    }
  }
  // The same table appears in several units; keep one question per cell.
  const seen = new Set<string>();
  return out.filter((q) => (seen.has(q.itemId + q.prompt) ? false : (seen.add(q.itemId + q.prompt), true)));
}

/**
 * Parse questions from real NT forms of nouns (and the article) learned by
 * `unit`, limited to the cases taught by then. Weighted toward common forms
 * but every attested form can appear.
 */
export function parseQuestions(unit: Unit, count: number, rand = Math.random, weight?: (itemId: string) => number): Question[] {
  const cases = casesTaught(unit);
  if (!cases.length) return [];
  const words = [...wordsThrough(unit.n), { lemma: 'ὁ', gloss: 'the', display: 'ὁ, ἡ, τό' }];
  const pool: Array<{ form: string; w: Word }> = [];
  for (const w of words) {
    for (const [form, pos, parse] of FORMS[w.lemma] ?? []) {
      if (pos !== 'N-' && pos !== 'RA') continue;
      if (!CASE_NAME[parse[4]] || !cases.includes(CASE_NAME[parse[4]])) continue;
      if (!pool.some((p) => p.form === form && p.w.lemma === w.lemma)) pool.push({ form, w });
    }
  }
  const picked: typeof pool = [];
  const items = shuffle(pool, rand);
  const wOf = (p: (typeof pool)[number]) => (weight ? weight(`form:${p.form}`) : 1);
  // Weighted sampling without replacement.
  while (picked.length < count && items.length) {
    const total = items.reduce((s, p) => s + wOf(p), 0);
    let r = rand() * total;
    const i = items.findIndex((p) => (r -= wOf(p)) <= 0);
    picked.push(...items.splice(i < 0 ? 0 : i, 1));
  }
  return picked.map(({ form, w }) => {
    const accepted = (FORMS[w.lemma] ?? [])
      .filter(([f, , parse]) => f === form && CASE_NAME[parse[4]])
      .map(([, , parse]) => ({ case: CASE_NAME[parse[4]], number: NUM_NAME[parse[5]], gender: GEN_NAME[parse[6]] }))
      // Only count readings in cases already taught: before ch. 7, ὥρας is
      // simply accusative plural, and that is the right answer.
      .filter((a) => cases.includes(a.case))
      .filter((a, i, arr) => arr.findIndex((b) => parseLabel(b) === parseLabel(a)) === i);
    const gloss = w.lemma === 'ὁ' ? 'the' : w.gloss;
    return {
      kind: 'parse' as const, itemId: `form:${form}`, prompt: 'Parse it', greek: form, lemma: w.display ?? w.lemma, gloss,
      accepted, cases,
      why: `${form}: ${accepted.map(parseLabel).join(' or ')} of ${w.display ?? w.lemma} ("${gloss}").`,
    };
  });
}

function letterQuestions(rand = Math.random): Question[] {
  return shuffle(LETTERS, rand).map((l) => {
    const { options, answer } = choice(l.name, LETTERS.map((x) => x.name), rand);
    return { kind: 'letter' as const, itemId: `alpha:${l.id}`, prompt: 'Which letter is this?', greek: l.lower, options, answer, why: `${l.lower} is ${l.name}, ${l.sound}.` };
  });
}

/* ------------------------------ checks and quizzes ------------------------------ */

/** The unit's practice check: up to 12 questions, mixed and shuffled. */
export function unitCheck(unitId: string, rand = Math.random): Question[] {
  const unit = unitById(unitId);
  const qs: Question[] = [...conceptQuestions(unitId)];
  if (unit.id === 'u02') qs.push(...letterQuestions(rand).slice(0, 8));
  const pool = wordsThrough(unit.n);
  qs.push(...shuffle(unit.words, rand).slice(0, 5).map((w) => meaningQuestion(w, pool, rand)));
  qs.push(...parseQuestions(unit, 4, rand));
  const cells = cellQuestions(unit.n, rand).filter((q) => (LESSONS[unitId]?.paradigms ?? []).some((p) => q.itemId.startsWith(`cell:${p.id}:`)));
  qs.push(...shuffle(cells, rand).slice(0, 3));
  return shuffle(qs, rand).slice(0, 12);
}

/** A practice quiz: 20 questions drawn from the units it covers. */
export function practiceQuiz(quizId: string, rand = Math.random): Question[] {
  const quiz = QUIZZES.find((q) => q.id === quizId);
  if (!quiz) return [];
  const units = quiz.covers.map(unitById).filter((u) => u.drafted);
  if (!units.length) return [];
  const last = units[units.length - 1];
  const qs: Question[] = [];
  for (const u of units) qs.push(...shuffle(conceptQuestions(u.id), rand).slice(0, 3));
  if (units.some((u) => u.id === 'u02')) qs.push(...letterQuestions(rand).slice(0, 5));
  const words = units.flatMap((u) => u.words);
  const pool = wordsThrough(last.n);
  qs.push(...shuffle(words, rand).slice(0, 6).map((w) => meaningQuestion(w, pool, rand)));
  qs.push(...parseQuestions(last, 6, rand));
  qs.push(...shuffle(cellQuestions(last.n, rand), rand).slice(0, 3));
  return shuffle(qs, rand).slice(0, 20);
}

/** Is a parse answer right? Any accepted parsing counts. */
export function parseIsRight(q: Extract<Question, { kind: 'parse' }>, a: ParseAnswer): boolean {
  return q.accepted.some((x) => x.case === a.case && x.number === a.number && x.gender === a.gender);
}
