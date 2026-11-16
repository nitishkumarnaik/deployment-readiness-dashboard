import { hash, seeded } from './community';
import { addDays, fromDateKey } from './dates';
import { syncAutoPost } from './feed';
import { buildFromTemplate, SPACE_TEMPLATES } from './spaces';
import { EMPTY_DATA, type AppData, type Block, type Entry, type SegmentId, type Space, type Tracker, type TrackerKind } from './types';

interface Seed {
  name: string;
  emoji: string;
  segment: SegmentId;
  kind: TrackerKind;
  target: number;
  /** probability of keeping a streak going / restarting one */
  keep: number;
  restart: number;
  ageDays: number;
  today: number; // amount already logged today
  visibility?: 'public' | 'private';
}

const SEEDS: Seed[] = [
  { name: 'Make bed', emoji: '🛏️', segment: 'custom', kind: 'check', target: 1, keep: 0.9, restart: 0.6, ageDays: 110, today: 1 },
  { name: 'Skincare', emoji: '🧴', segment: 'custom', kind: 'count', target: 2, keep: 0.85, restart: 0.5, ageDays: 110, today: 2, visibility: 'private' },
  { name: 'Gratitude', emoji: '🙏', segment: 'custom', kind: 'check', target: 1, keep: 0.8, restart: 0.5, ageDays: 90, today: 1 },
  { name: 'Ideation hour', emoji: '💡', segment: 'ideation', kind: 'duration', target: 60, keep: 0.88, restart: 0.55, ageDays: 75, today: 60 },
  { name: 'Deep work', emoji: '🎧', segment: 'focus', kind: 'duration', target: 90, keep: 0.82, restart: 0.5, ageDays: 110, today: 45 },
  { name: 'Morning without phone', emoji: '📵', segment: 'focus', kind: 'check', target: 1, keep: 0.75, restart: 0.4, ageDays: 60, today: 1 },
  { name: 'Workout', emoji: '🏋️', segment: 'fitness', kind: 'check', target: 1, keep: 0.6, restart: 0.55, ageDays: 110, today: 0 },
  { name: 'Read papers', emoji: '📄', segment: 'research', kind: 'count', target: 2, keep: 0.8, restart: 0.5, ageDays: 40, today: 1 },
  { name: 'Study session', emoji: '📚', segment: 'study', kind: 'duration', target: 60, keep: 0.75, restart: 0.45, ageDays: 50, today: 0 },
  { name: 'Sleep 7+ hrs', emoji: '😴', segment: 'sleep', kind: 'check', target: 1, keep: 0.8, restart: 0.6, ageDays: 110, today: 1 },
  { name: 'In bed by 11', emoji: '🌙', segment: 'sleep', kind: 'check', target: 1, keep: 0.7, restart: 0.4, ageDays: 45, today: 0 },
  { name: 'Water', emoji: '💧', segment: 'custom', kind: 'count', target: 8, keep: 0.7, restart: 0.5, ageDays: 110, today: 3, visibility: 'private' },
];

function stamp(dateKey: string, hour: number, minute = 0): string {
  const d = fromDateKey(dateKey);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** A time earlier today (never before midnight), spread out by index. */
function todayStamp(today: string, nowMs: number, i: number): string {
  const midnight = fromDateKey(today);
  midnight.setHours(0, 0, 0, 0);
  const span = Math.max(60_000, nowMs - midnight.getTime());
  return new Date(nowMs - Math.min(span - 60_000, (i + 1) * 9 * 60_000)).toISOString();
}

/** About four months of believable data, so people (and app reviewers) can explore every screen. */
export function buildDemoData(today: string, nowMs: number): AppData {
  const startedOn = addDays(today, -110);
  const trackers: Tracker[] = SEEDS.map((s, i) => ({
    id: `t${i}`,
    name: s.name,
    emoji: s.emoji,
    segment: s.segment,
    kind: s.kind,
    target: s.target,
    visibility: s.visibility ?? 'public',
    order: i,
    archived: false,
    createdOn: addDays(today, -s.ageDays),
  }));

  const entries: Entry[] = [];
  SEEDS.forEach((s, i) => {
    const t = trackers[i];
    const r = seeded(hash(`demo|${s.name}`));
    let doneYesterday = false;
    for (let back = s.ageDays; back >= 1; back--) {
      const day = addDays(today, -back);
      const done: boolean = r() < (doneYesterday ? s.keep : s.restart);
      doneYesterday = done;
      let amount = 0;
      if (done) amount = s.kind === 'duration' ? s.target + Math.round(r() * 4) * 5 : s.target;
      else if (s.kind !== 'check' && r() < 0.3) amount = s.kind === 'duration' ? Math.round((s.target * 0.5) / 5) * 5 : Math.max(1, s.target - 1);
      if (amount > 0) {
        entries.push({ id: `e${i}-${back}`, trackerId: t.id, dateKey: day, amount, at: stamp(day, 8 + (i % 12)), source: s.kind === 'duration' ? 'timer' : 'tap' });
      }
    }
    if (s.today > 0) {
      entries.push({ id: `e${i}-0`, trackerId: t.id, dateKey: today, amount: s.today, at: todayStamp(today, nowMs, i), source: s.kind === 'duration' ? 'timer' : 'tap' });
    }
  });

  let data: AppData = {
    ...EMPTY_DATA,
    profile: { name: 'Alex', handle: 'alex.makes', emoji: '🌀', startedOn, autoShare: true },
    trackers,
    entries,
    following: ['m-ava', 'm-kenji', 'm-sam', 'm-mira'],
    challenges: [
      { challengeId: 'focus-week', joinedOn: addDays(today, -3), trackerId: 't4' },
      { challengeId: 'ideation-30', joinedOn: addDays(today, -12), trackerId: 't3' },
    ],
  };

  // Automatic posts for the last three days of completed goals.
  for (let back = 2; back >= 0; back--) {
    const day = addDays(today, -back);
    trackers.forEach((t, i) => {
      const at = back === 0 ? todayStamp(today, nowMs, i) : stamp(day, 18, i * 4);
      data = syncAutoPost(data, t.id, day, at);
    });
  }

  // Spaces, built from templates so they reuse the trackers above.
  const nowIso = new Date(nowMs).toISOString();
  const spaces: Space[] = [];
  const blocks: Block[] = [];
  let allTrackers = [...data.trackers];
  ['ideation-lab', 'research-hub', 'deep-work', 'training-block'].forEach((id, i) => {
    const tpl = SPACE_TEMPLATES.find((x) => x.id === id)!;
    const built = buildFromTemplate(tpl, { existing: allTrackers, today, nowIso, order: i, trackerOrderStart: allTrackers.length });
    allTrackers = [...allTrackers, ...built.newTrackers];
    spaces.push(built.space);
    blocks.push(...built.blocks);
  });

  // A nested folder inside the research hub.
  const hub = spaces[1];
  const thesis: Space = { id: 'sp-thesis', name: 'Thesis', emoji: '🎓', parentId: hub.id, columns: 1, order: 0, createdAt: nowIso };
  spaces.push(thesis);
  const hubBlocks = blocks.filter((b) => b.spaceId === hub.id);
  blocks.push({ id: 'b-thesis', spaceId: hub.id, type: 'folder', size: 'wide', order: hubBlocks.length, title: 'Thesis', childSpaceId: thesis.id, createdAt: nowIso });
  blocks.push(
    { id: 'b-t1', spaceId: thesis.id, type: 'heading', size: 'wide', order: 0, title: 'Chapter plan', createdAt: nowIso },
    { id: 'b-t2', spaceId: thesis.id, type: 'task', size: 'wide', order: 1, title: 'Ch. 1 Introduction', done: true, createdAt: nowIso },
    { id: 'b-t3', spaceId: thesis.id, type: 'task', size: 'wide', order: 2, title: 'Ch. 2 Related work', done: false, trackerId: 't7', createdAt: nowIso },
    { id: 'b-t4', spaceId: thesis.id, type: 'task', size: 'wide', order: 3, title: 'Ch. 3 Method', done: false, createdAt: nowIso },
    { id: 'b-t5', spaceId: thesis.id, type: 'note', size: 'wide', order: 4, title: 'Advisor feedback', body: 'Narrow the scope to two datasets. Add an ablation for the retrieval step.', createdAt: nowIso },
  );
  // Tick one ideation task so the board shows progress.
  const ideaTask = blocks.find((b) => b.spaceId === spaces[0].id && b.type === 'task');
  if (ideaTask) ideaTask.done = true;

  return { ...data, trackers: allTrackers, spaces, blocks };
}
