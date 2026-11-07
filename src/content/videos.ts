/**
 * videos.ts: links to Bill Mounce's free videos on billmounce.com, by
 * chapter of Basics of Biblical Greek (4th ed.).
 *
 * WHAT EXISTS (checked Nov 6, 2026)
 *   Chapter overview   https://www.billmounce.com/biblicalgreek/chapteroverview/<n>
 *                      for chapters 2 and up (part of his free online class).
 *   Chapter 1          has no overview; its chapter page links the lecture:
 *                      https://www.billmounce.com/biblicalgreek/1-the-greek-language
 *   Exercise screencast https://www.billmounce.com/workbook/<n>
 *                      (walks through the workbook exercises; from chapter 3).
 *   Some videos may ask you to sign in to the free class or, for the full
 *   lectures, to buy them. We only link; nothing is copied here.
 *
 * If a link stops working, the chapter pages under "Study Greek" on
 * billmounce.com are the place to look.
 */

export interface VideoLink { label: string; href: string }

/** Chapter numbers in a unit's "chapters" text: "ch. 1 to 2" -> [1, 2]; "ch. 7a" -> [7]. */
export function chapterNumbers(chapters: string): number[] {
  const range = /(\d+)\D+to\D+(\d+)/.exec(chapters);
  if (range) {
    const [a, b] = [Number(range[1]), Number(range[2])];
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  }
  return [...new Set((chapters.match(/\d+/g) ?? []).map(Number))];
}

/** Overview videos for a unit's chapters. */
export function overviewLinks(chapters: string): VideoLink[] {
  return chapterNumbers(chapters).map((n) => n === 1
    ? { label: 'Chapter 1: lecture', href: 'https://www.billmounce.com/biblicalgreek/1-the-greek-language' }
    : { label: `Chapter ${n}: overview`, href: `https://www.billmounce.com/biblicalgreek/chapteroverview/${n}` });
}

/** Workbook screencasts for a unit's chapters (chapter 3 and up). */
export function screencastLinks(chapters: string): VideoLink[] {
  return chapterNumbers(chapters).filter((n) => n >= 3)
    .map((n) => ({ label: `Chapter ${n}: exercise screencast`, href: `https://www.billmounce.com/workbook/${n}` }));
}
