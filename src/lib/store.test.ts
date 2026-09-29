/**
 * The merge is the one piece of logic that can silently lose study history
 * if it is wrong, so it gets the most careful tests.
 */
import { describe, expect, it } from 'vitest';
import { emptyProgress, mergeProgress, totalFor, type Progress } from './store';
import { newCard } from './srs';

function withCard(id: string, updatedAt: string, reps: number): Progress {
  const p = emptyProgress();
  p.cards[id] = { ...newCard(new Date(updatedAt)), updatedAt, reps };
  return p;
}

describe('mergeProgress', () => {
  it('keeps the newer copy of a card', () => {
    const older = withCard('alpha:name', '2026-10-01T10:00:00Z', 1);
    const newer = withCard('alpha:name', '2026-10-02T10:00:00Z', 5);
    expect(mergeProgress(older, newer).cards['alpha:name'].reps).toBe(5);
    expect(mergeProgress(newer, older).cards['alpha:name'].reps).toBe(5);
  });

  it('keeps cards that exist on only one side', () => {
    const merged = mergeProgress(withCard('a', '2026-10-01T00:00:00Z', 1), withCard('b', '2026-10-01T00:00:00Z', 1));
    expect(Object.keys(merged.cards).sort()).toEqual(['a', 'b']);
  });

  it('never double-counts stats when the same data is merged twice', () => {
    const p = emptyProgress();
    p.stats.nu = { mac: { seen: 10, correct: 7 } };
    const once = mergeProgress(p, emptyProgress());
    const twice = mergeProgress(once, p);
    expect(totalFor(twice, 'nu')).toEqual({ seen: 10, correct: 7 });
  });

  it('adds counters from different devices', () => {
    const mac = emptyProgress();
    mac.stats.nu = { mac: { seen: 10, correct: 7 } };
    const ipad = emptyProgress();
    ipad.stats.nu = { ipad: { seen: 4, correct: 4 } };
    expect(totalFor(mergeProgress(mac, ipad), 'nu')).toEqual({ seen: 14, correct: 11 });
  });

  it('unions sessions by id and keeps the later end', () => {
    const a = emptyProgress();
    a.sessions = [{ id: 's1', deviceId: 'mac', start: '2026-10-01T10:00:00Z', end: '2026-10-01T10:10:00Z', counts: { speed: 5 } }];
    const b = emptyProgress();
    b.sessions = [
      { id: 's1', deviceId: 'mac', start: '2026-10-01T10:00:00Z', end: '2026-10-01T10:25:00Z', counts: { speed: 20 } },
      { id: 's2', deviceId: 'ipad', start: '2026-10-02T10:00:00Z', end: '2026-10-02T10:20:00Z', counts: {} },
    ];
    const m = mergeProgress(a, b);
    expect(m.sessions.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(m.sessions[0].counts.speed).toBe(20);
  });
});
