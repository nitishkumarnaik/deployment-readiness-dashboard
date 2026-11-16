import { addDays, diffDays } from './dates';
import { SAMPLE_MEMBERS } from './community';
import { getSegment, type TrackerTemplate } from './segments';
import { amountsByDay } from './trackers';
import type { ChallengeJoin, Entry, SegmentId, Tracker } from './types';

export interface Challenge {
  id: string;
  title: string;
  emoji: string;
  segment: SegmentId;
  /** Days available after joining. */
  windowDays: number;
  /** Days the goal must be met within the window. */
  goalDays: number;
  blurb: string;
  trackerName: string;
}

export const CHALLENGES: Challenge[] = [
  { id: 'ideation-30', title: '30 ideation hours', emoji: '💡', segment: 'ideation', windowDays: 30, goalDays: 30, blurb: 'One protected hour of ideas, every day for a month.', trackerName: 'Ideation hour' },
  { id: 'focus-week', title: 'Deep Focus Week', emoji: '🎧', segment: 'focus', windowDays: 7, goalDays: 5, blurb: 'Five 90-minute deep work blocks in seven days.', trackerName: 'Deep work' },
  { id: 'sleep-21', title: 'Lights out by 11', emoji: '🌙', segment: 'sleep', windowDays: 21, goalDays: 21, blurb: 'In bed by 11 for 21 nights straight.', trackerName: 'In bed by 11' },
  { id: 'study-14', title: '14-day study streak', emoji: '📚', segment: 'study', windowDays: 14, goalDays: 14, blurb: 'Two focused study hours a day for two weeks.', trackerName: 'Study session' },
  { id: 'papers-20', title: 'Paper sprint', emoji: '📄', segment: 'research', windowDays: 20, goalDays: 10, blurb: 'Read 2 papers a day on 10 of the next 20 days: 20 papers.', trackerName: 'Read papers' },
  { id: 'move-30', title: 'Move every day', emoji: '👟', segment: 'fitness', windowDays: 30, goalDays: 30, blurb: '8,000 steps a day for 30 days.', trackerName: 'Steps 8k' },
];

export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

export function challengeTemplate(c: Challenge): TrackerTemplate & { segment: SegmentId } {
  const seg = getSegment(c.segment);
  const t = seg.templates.find((x) => x.name === c.trackerName) ?? seg.templates[0];
  return { ...t, segment: c.segment };
}

export type ChallengeStatus = 'active' | 'won' | 'ended';

export interface ChallengeProgress {
  daysDone: number;
  goalDays: number;
  daysLeft: number;
  endsOn: string;
  status: ChallengeStatus;
}

export function challengeProgress(c: Challenge, join: ChallengeJoin, tracker: Tracker | undefined, entries: Entry[], today: string): ChallengeProgress {
  const endsOn = addDays(join.joinedOn, c.windowDays - 1);
  let daysDone = 0;
  if (tracker) {
    const byDay = amountsByDay(entries, tracker.id);
    for (let d = join.joinedOn; d <= endsOn && d <= today; d = addDays(d, 1)) {
      if ((byDay.get(d) ?? 0) >= tracker.target) daysDone += 1;
    }
  }
  const daysLeft = Math.max(0, diffDays(endsOn, today) + (today <= endsOn ? 1 : 0));
  const status: ChallengeStatus = daysDone >= c.goalDays ? 'won' : today > endsOn ? 'ended' : 'active';
  return { daysDone, goalDays: c.goalDays, daysLeft, endsOn, status };
}

/** People in the preview community taking part (sample members who follow this segment). */
export function sampleParticipants(c: Challenge): number {
  return SAMPLE_MEMBERS.filter((m) => m.segments.includes(c.segment)).length;
}
