import { addDays, fromDateKey } from './dates';
import { getSegment } from './segments';
import type { Member, Post, SegmentId } from './types';

/**
 * The preview community. Until accounts and a backend are switched on, these
 * clearly labelled sample members let people try the feed, props, leaderboards
 * and challenges. Their activity is generated deterministically from the date.
 */
export const SAMPLE_MEMBERS: Member[] = [
  { id: 'm-ava', name: 'Ava', handle: 'ava.builds', emoji: '🦊', sample: true, segments: ['ideation', 'focus'] },
  { id: 'm-kenji', name: 'Kenji', handle: 'kenji.reads', emoji: '🐼', sample: true, segments: ['research', 'study'] },
  { id: 'm-mira', name: 'Mira', handle: 'mira.lab', emoji: '🦉', sample: true, segments: ['research', 'sleep'] },
  { id: 'm-theo', name: 'Theo', handle: 'theo.trains', emoji: '🐺', sample: true, segments: ['fitness', 'sleep'] },
  { id: 'm-noor', name: 'Noor', handle: 'noor.rests', emoji: '🐨', sample: true, segments: ['sleep', 'focus'] },
  { id: 'm-sam', name: 'Sam', handle: 'sam.ships', emoji: '🐙', sample: true, segments: ['focus', 'ideation'] },
  { id: 'm-lena', name: 'Lena', handle: 'lena.studies', emoji: '🦋', sample: true, segments: ['study', 'fitness'] },
  { id: 'm-raf', name: 'Raf', handle: 'raf.thinks', emoji: '🐢', sample: true, segments: ['ideation', 'research'] },
];

export function getMember(id: string): Member | undefined {
  return SAMPLE_MEMBERS.find((m) => m.id === id);
}

/** Stable 32-bit hash for seeding. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seeded(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function headlineFor(kind: 'check' | 'count' | 'duration', name: string, target: number, r: () => number): string {
  if (kind === 'duration') return `${Math.max(10, Math.round((target * (0.9 + r() * 0.5)) / 5) * 5)} min of ${name}`;
  if (kind === 'count') return `${target + Math.floor(r() * 2)}× ${name}`;
  return name;
}

/**
 * Sample posts for the last `days` days (today included), newest first.
 * Posts timed later than `nowMs` are left out so the feed never shows the future.
 */
export function samplePosts(today: string, nowMs: number, days = 4): Post[] {
  const posts: Post[] = [];
  for (let back = 0; back < days; back++) {
    const dateKey = addDays(today, -back);
    for (const m of SAMPLE_MEMBERS) {
      const r = seeded(hash(`${m.id}|${dateKey}`));
      if (r() > 0.72) continue;
      const segment: SegmentId = m.segments[Math.floor(r() * m.segments.length)];
      const seg = getSegment(segment);
      const tpl = seg.templates[Math.floor(r() * seg.templates.length)];
      const hour = 6 + Math.floor(r() * 16);
      const minute = Math.floor(r() * 60);
      const d = fromDateKey(dateKey);
      d.setHours(hour, minute, 0, 0);
      if (d.getTime() > nowMs) continue;
      const base = 3 + (hash(`${m.id}|${segment}`) % 40);
      const week = Array.from({ length: 7 }, (_, i) => (i === 6 ? 2 : r() > 0.25 ? 2 : r() > 0.5 ? 1 : 0));
      posts.push({
        id: `s-${m.id}-${dateKey}`,
        authorId: m.id,
        trackerName: tpl.name,
        emoji: tpl.emoji,
        segment,
        dateKey,
        at: d.toISOString(),
        headline: headlineFor(tpl.kind, tpl.name, tpl.target, r),
        streak: Math.max(1, base - back),
        week,
        sampleProps: 2 + Math.floor(r() * 30),
      });
    }
  }
  return posts.sort((a, b) => (a.at < b.at ? 1 : -1));
}

/** Sample 7-day consistency (0..1, in sevenths) and streak for a member on a segment board. */
export function sampleStanding(memberId: string, segment: SegmentId, weekKey: string): { consistency: number; streak: number } {
  const r = seeded(hash(`${memberId}|${segment}|${weekKey}`));
  const daysMet = 3 + Math.floor(r() * 5); // 3..7
  return { consistency: daysMet / 7, streak: daysMet === 7 ? 7 + Math.floor(r() * 40) : Math.floor(r() * daysMet) };
}
