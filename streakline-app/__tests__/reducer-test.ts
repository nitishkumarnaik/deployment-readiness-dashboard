import { challengeProgress, getChallenge } from '../src/lib/challenges';
import { buildDemoData } from '../src/lib/demo';
import { buildFeed, leaderboard } from '../src/lib/feed';
import { buildFromTemplate, moveBlock, spaceBlocks, SPACE_TEMPLATES } from '../src/lib/spaces';
import { amountOn } from '../src/lib/trackers';
import { ME, type Block } from '../src/lib/types';
import { migrate, reducer } from '../src/state/reducer';
import { data, entry, tracker } from './helpers';

const DAY = '2026-11-16';
const NOW = '2026-11-16T12:00:00.000Z';

describe('logging and automatic posts', () => {
  test('hitting a public goal posts to the feed; undoing removes the post', () => {
    let s = data({ trackers: [tracker({ kind: 'count', target: 2 })] });
    s = reducer(s, { type: 'log', trackerId: 't1', dateKey: DAY, amount: 1, source: 'tap', nowIso: NOW });
    expect(s.posts).toHaveLength(0);
    s = reducer(s, { type: 'log', trackerId: 't1', dateKey: DAY, amount: 1, source: 'tap', nowIso: NOW });
    expect(s.posts).toHaveLength(1);
    expect(s.posts[0]).toMatchObject({ authorId: ME, auto: true, headline: '2× Deep work', streak: 1 });
    s = reducer(s, { type: 'log', trackerId: 't1', dateKey: DAY, amount: 1, source: 'tap', nowIso: NOW });
    expect(s.posts).toHaveLength(1);
    expect(s.posts[0].headline).toBe('3× Deep work');
    s = reducer(s, { type: 'undoLast', trackerId: 't1', dateKey: DAY, nowIso: NOW });
    s = reducer(s, { type: 'undoLast', trackerId: 't1', dateKey: DAY, nowIso: NOW });
    expect(amountOn(s.entries, 't1', DAY)).toBe(1);
    expect(s.posts).toHaveLength(0);
  });

  test('private trackers and auto-share off never post', () => {
    let s = data({ trackers: [tracker({ kind: 'check', target: 1, visibility: 'private' })] });
    s = reducer(s, { type: 'setCheck', trackerId: 't1', dateKey: DAY, done: true, nowIso: NOW });
    expect(s.posts).toHaveLength(0);
    let s2 = data({ trackers: [tracker({ kind: 'check', target: 1 })] });
    s2 = reducer(s2, { type: 'updateProfile', patch: { autoShare: false } });
    s2 = reducer(s2, { type: 'setCheck', trackerId: 't1', dateKey: DAY, done: true, nowIso: NOW });
    expect(s2.posts).toHaveLength(0);
  });

  test('check toggles on and off', () => {
    let s = data({ trackers: [tracker({ kind: 'check', target: 1 })] });
    s = reducer(s, { type: 'setCheck', trackerId: 't1', dateKey: DAY, done: true, nowIso: NOW });
    s = reducer(s, { type: 'setCheck', trackerId: 't1', dateKey: DAY, done: true, nowIso: NOW });
    expect(amountOn(s.entries, 't1', DAY)).toBe(1);
    s = reducer(s, { type: 'setCheck', trackerId: 't1', dateKey: DAY, done: false, nowIso: NOW });
    expect(amountOn(s.entries, 't1', DAY)).toBe(0);
    expect(s.posts).toHaveLength(0);
  });
});

describe('focus timer', () => {
  test('start, pause, resume, finish logs the minutes', () => {
    let s = data({ trackers: [tracker({ target: 60 })] });
    s = reducer(s, { type: 'timerStart', trackerId: 't1', nowMs: 0 });
    s = reducer(s, { type: 'timerPause', nowMs: 25 * 60_000 });
    s = reducer(s, { type: 'timerResume', nowMs: 40 * 60_000 });
    s = reducer(s, { type: 'timerFinish', dateKey: DAY, nowMs: 75 * 60_000, nowIso: NOW });
    expect(s.timer).toBeNull();
    expect(amountOn(s.entries, 't1', DAY)).toBe(60);
    expect(s.posts[0].headline).toBe('60 min of Deep work');
  });

  test('sessions under 30 seconds are discarded', () => {
    let s = data({ trackers: [tracker()] });
    s = reducer(s, { type: 'timerStart', trackerId: 't1', nowMs: 0 });
    s = reducer(s, { type: 'timerFinish', dateKey: DAY, nowMs: 10_000, nowIso: NOW });
    expect(s.entries).toHaveLength(0);
    expect(s.timer).toBeNull();
  });
});

describe('spaces and blocks', () => {
  test('templates reuse existing trackers and create missing ones', () => {
    const existing = [tracker({ id: 'x', name: 'Ideation hour', segment: 'ideation', target: 60 })];
    const tpl = SPACE_TEMPLATES.find((t) => t.id === 'ideation-lab')!;
    const built = buildFromTemplate(tpl, { existing, today: DAY, nowIso: NOW, order: 0, trackerOrderStart: 1 });
    expect(built.newTrackers.map((t) => t.name)).toEqual(['Capture 3 ideas']);
    const trackerBlocks = built.blocks.filter((b) => b.type === 'tracker');
    expect(trackerBlocks[0].trackerId).toBe('x');
    expect(built.blocks.map((b) => b.type)).toEqual(['tracker', 'tracker', 'note', 'heading', 'task', 'task']);
  });

  test('moving a block swaps it with its neighbour only within its space', () => {
    const mk = (id: string, spaceId: string, order: number): Block => ({ id, spaceId, type: 'note', size: 'small', order, title: id, createdAt: NOW });
    const blocks = [mk('a', 's1', 0), mk('b', 's1', 1), mk('c', 's1', 2), mk('z', 's2', 0)];
    const moved = moveBlock(blocks, 'c', -1);
    expect(spaceBlocks(moved, 's1').map((b) => b.id)).toEqual(['a', 'c', 'b']);
    expect(moveBlock(blocks, 'a', -1)).toBe(blocks);
  });

  test('ticking a task linked to a tracker logs progress; un-ticking undoes it', () => {
    let s = data({
      trackers: [tracker({ kind: 'count', target: 2, name: 'Read papers' })],
      blocks: [{ id: 'task', spaceId: 's', type: 'task', size: 'wide', order: 0, title: 'Lit review', done: false, trackerId: 't1', createdAt: NOW }],
    });
    s = reducer(s, { type: 'toggleTask', id: 'task', dateKey: DAY, nowIso: NOW });
    expect(amountOn(s.entries, 't1', DAY)).toBe(1);
    expect(s.blocks[0].done).toBe(true);
    s = reducer(s, { type: 'toggleTask', id: 'task', dateKey: DAY, nowIso: NOW });
    expect(amountOn(s.entries, 't1', DAY)).toBe(0);
    expect(s.blocks[0].done).toBe(false);
  });

  test('deleting a space removes nested folders and their blocks', () => {
    let s = data({
      spaces: [
        { id: 'p', name: 'P', emoji: '📁', parentId: null, columns: 2, order: 0, createdAt: NOW },
        { id: 'c', name: 'C', emoji: '📁', parentId: 'p', columns: 1, order: 0, createdAt: NOW },
      ],
      blocks: [
        { id: 'f', spaceId: 'p', type: 'folder', size: 'wide', order: 0, title: 'C', childSpaceId: 'c', createdAt: NOW },
        { id: 'n', spaceId: 'c', type: 'note', size: 'small', order: 0, title: 'n', createdAt: NOW },
      ],
    });
    s = reducer(s, { type: 'deleteSpace', id: 'p' });
    expect(s.spaces).toHaveLength(0);
    expect(s.blocks).toHaveLength(0);
  });
});

describe('community', () => {
  const nowMs = new Date(2026, 10, 16, 23, 0).getTime();

  test('feed includes my posts and followed members; props add one', () => {
    const demo = buildDemoData(DAY, nowMs);
    const following = buildFeed(demo, DAY, nowMs, 'following');
    expect(following.some((f) => f.mine)).toBe(true);
    expect(following.every((f) => f.mine || demo.following.includes(f.author.id))).toBe(true);
    const everyone = buildFeed(demo, DAY, nowMs, 'everyone');
    expect(everyone.length).toBeGreaterThan(following.length);
    const target = everyone.find((f) => !f.mine)!;
    const after = buildFeed(reducer(demo, { type: 'toggleProps', postId: target.post.id }), DAY, nowMs, 'everyone').find((f) => f.post.id === target.post.id)!;
    expect(after.props).toBe(target.props + 1);
    expect(after.propped).toBe(true);
  });

  test('sample posts never come from the future', () => {
    const early = new Date(2026, 10, 16, 6, 30).getTime();
    const feed = buildFeed(data(), DAY, early, 'everyone');
    expect(feed.every((f) => new Date(f.post.at).getTime() <= early)).toBe(true);
  });

  test('leaderboard ranks you when you track the segment', () => {
    const demo = buildDemoData(DAY, nowMs);
    const board = leaderboard(demo, 'focus', DAY);
    expect(board.youTrack).toBe(true);
    expect(board.rows.some((r) => r.memberId === ME)).toBe(true);
    for (let i = 1; i < board.rows.length; i++) expect(board.rows[i - 1].consistency).toBeGreaterThanOrEqual(board.rows[i].consistency);
    expect(leaderboard(data(), 'study', DAY).youTrack).toBe(false);
  });

  test('challenge progress counts goal days inside the window', () => {
    const c = getChallenge('focus-week')!;
    const t = tracker({ target: 90 });
    const entries = ['2026-11-10', '2026-11-11', '2026-11-13', '2026-11-20'].map((d) => entry('t1', d, 90));
    const p = challengeProgress(c, { challengeId: c.id, joinedOn: '2026-11-10', trackerId: 't1' }, t, entries, '2026-11-14');
    expect(p).toMatchObject({ daysDone: 3, goalDays: 5, status: 'active', endsOn: '2026-11-16', daysLeft: 3 });
    const ended = challengeProgress(c, { challengeId: c.id, joinedOn: '2026-11-10', trackerId: 't1' }, t, entries, '2026-11-25');
    expect(ended.status).toBe('ended');
  });
});

describe('demo and migration', () => {
  test('demo data is consistent', () => {
    const demo = buildDemoData(DAY, new Date(2026, 10, 16, 21, 0).getTime());
    const ids = new Set(demo.trackers.map((t) => t.id));
    expect(demo.entries.every((e) => ids.has(e.trackerId))).toBe(true);
    expect(demo.blocks.filter((b) => b.trackerId).every((b) => ids.has(b.trackerId!))).toBe(true);
    expect(demo.posts.length).toBeGreaterThan(0);
    expect(demo.spaces.find((s) => s.parentId)).toBeDefined();
  });

  test('migrate tolerates junk', () => {
    expect(migrate(null).profile).toBeNull();
    expect(migrate({ trackers: 'nope' }).trackers).toEqual([]);
  });
});
