/**
 * speech.ts: read letter names and example words aloud.
 *
 * THE PROBLEM
 *   Browsers can speak Greek (a "el-GR" voice), but that voice speaks MODERN
 *   Greek: η, ι, υ, ει, οι all come out as "ee", β as "v", δ as the "th" in
 *   "this". Mounce and the seminary use ERASMIAN pronunciation, so the
 *   Greek voice would teach the wrong sounds.
 *
 * THE WORKAROUND
 *   We use an ENGLISH voice and give it a phonetic respelling of the
 *   Erasmian pronunciation, stressed where the Greek accent falls:
 *     ἀγάπη -> "ah-GAH-pay",  θεός -> "theh-OSS",  eta -> "AY-tah".
 *   The respellings live in data.ts (`say` on each letter), so they can be
 *   corrected there without touching this file.
 *
 * LIMITS (be aware when listening)
 *   - It is a synthetic approximation, good for names and stress, not a
 *     model accent.
 *   - English has no sound for χ (ch as in "loch"); the voice says "k".
 *   - υ is rendered "oo"; Mounce's ideal is the French u / German ü.
 *   For real Erasmian audio, Mounce's free vocabulary recordings on
 *   billmounce.com remain the reference.
 *
 * Voices come from the operating system. On a Mac, iPad or iPhone the
 * built-in "Samantha" (en-US) is clear and works offline.
 */

let chosen: SpeechSynthesisVoice | null = null;

/** True if this browser can speak at all. */
export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Pick the clearest available English voice. Voices load asynchronously in
 * some browsers (Chrome), so this is re-run when the list changes.
 */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  const preferred = ['Samantha', 'Google US English', 'Microsoft Aria', 'Alex', 'Karen', 'Daniel'];
  for (const name of preferred) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang === 'en-US') ?? voices[0] ?? null;
}

if (speechAvailable()) {
  chosen = pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', () => { chosen = pickVoice(); });
}

/**
 * Speak one or more phrases, in order, with a short pause between them.
 * Calling it again interrupts whatever is playing (so rapid clicks do not
 * queue up a backlog of speech).
 */
export function speak(...phrases: string[]): void {
  if (!speechAvailable()) return;
  speechSynthesis.cancel();
  for (const phrase of phrases) {
    // Lowercase so the voice never reads a stressed syllable in capitals
    // ("AY") as letters of an acronym. The capitals are for your eyes: the
    // respelling is shown on screen next to the speaker button.
    const u = new SpeechSynthesisUtterance(phrase.toLowerCase());
    if (chosen) u.voice = chosen;
    u.lang = chosen?.lang ?? 'en-US';
    u.rate = 0.8; // a little slower than conversation, for learning
    speechSynthesis.speak(u);
  }
}
