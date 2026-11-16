import { syncAutoPost } from '../lib/feed';
import { newId } from '../lib/id';
import { descendantIds, moveBlock, nextOrder } from '../lib/spaces';
import { elapsedMs, minutesToLog } from '../lib/timer';
import { amountOn } from '../lib/trackers';
import {
  EMPTY_DATA,
  type AppData,
  type Block,
  type ChallengeJoin,
  type Comment,
  type Entry,
  type Post,
  type Profile,
  type Space,
  type Tracker,
} from '../lib/types';

export type Action =
  | { type: 'hydrate'; data: unknown }
  | { type: 'setProfile'; profile: Profile }
  | { type: 'updateProfile'; patch: Partial<Profile> }
  | { type: 'addTrackers'; trackers: Tracker[]; spaceId?: string; nowIso: string }
  | { type: 'updateTracker'; id: string; patch: Partial<Tracker> }
  | { type: 'deleteTracker'; id: string }
  | { type: 'moveTracker'; id: string; dir: -1 | 1 }
  | { type: 'log'; trackerId: string; dateKey: string; amount: number; source: Entry['source']; nowIso: string }
  | { type: 'undoLast'; trackerId: string; dateKey: string; nowIso: string }
  | { type: 'setCheck'; trackerId: string; dateKey: string; done: boolean; nowIso: string }
  | { type: 'timerStart'; trackerId: string; nowMs: number }
  | { type: 'timerPause'; nowMs: number }
  | { type: 'timerResume'; nowMs: number }
  | { type: 'timerFinish'; dateKey: string; nowMs: number; nowIso: string }
  | { type: 'timerCancel' }
  | { type: 'addSpace'; space: Space; blocks: Block[]; trackers: Tracker[] }
  | { type: 'updateSpace'; id: string; patch: Partial<Space> }
  | { type: 'deleteSpace'; id: string }
  | { type: 'addBlock'; block: Block; childSpace?: Space }
  | { type: 'updateBlock'; id: string; patch: Partial<Block> }
  | { type: 'deleteBlock'; id: string }
  | { type: 'moveBlock'; id: string; dir: -1 | 1 }
  | { type: 'toggleTask'; id: string; dateKey: string; nowIso: string }
  | { type: 'toggleProps'; postId: string }
  | { type: 'addComment'; comment: Comment }
  | { type: 'toggleFollow'; memberId: string }
  | { type: 'addPost'; post: Post }
  | { type: 'deletePost'; id: string }
  | { type: 'joinChallenge'; join: ChallengeJoin; tracker?: Tracker }
  | { type: 'leaveChallenge'; challengeId: string }
  | { type: 'reset' };

function addEntry(state: AppData, entry: Entry, nowIso: string): AppData {
  return syncAutoPost({ ...state, entries: [...state.entries, entry] }, entry.trackerId, entry.dateKey, nowIso);
}

function removeEntry(state: AppData, entryId: string, nowIso: string): AppData {
  const entry = state.entries.find((e) => e.id === entryId);
  if (!entry) return state;
  return syncAutoPost({ ...state, entries: state.entries.filter((e) => e.id !== entryId) }, entry.trackerId, entry.dateKey, nowIso);
}

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'hydrate':
      return migrate(action.data);

    case 'setProfile':
      return { ...state, profile: action.profile };

    case 'updateProfile':
      return state.profile ? { ...state, profile: { ...state.profile, ...action.patch } } : state;

    case 'addTrackers': {
      let next: AppData = { ...state, trackers: [...state.trackers, ...action.trackers] };
      if (action.spaceId) {
        const start = nextOrder(next.blocks.filter((b) => b.spaceId === action.spaceId));
        const blocks: Block[] = action.trackers.map((t, i) => ({
          id: newId(),
          spaceId: action.spaceId!,
          type: 'tracker',
          size: 'small',
          order: start + i,
          title: t.name,
          trackerId: t.id,
          createdAt: action.nowIso,
        }));
        next = { ...next, blocks: [...next.blocks, ...blocks] };
      }
      return next;
    }

    case 'updateTracker':
      return { ...state, trackers: state.trackers.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)) };

    case 'deleteTracker':
      return {
        ...state,
        trackers: state.trackers.filter((t) => t.id !== action.id),
        entries: state.entries.filter((e) => e.trackerId !== action.id),
        blocks: state.blocks
          .filter((b) => !(b.type === 'tracker' && b.trackerId === action.id))
          .map((b) => (b.trackerId === action.id ? { ...b, trackerId: undefined, loggedEntryId: undefined } : b)),
        posts: state.posts.filter((p) => p.trackerId !== action.id),
        challenges: state.challenges.filter((c) => c.trackerId !== action.id),
        timer: state.timer?.trackerId === action.id ? null : state.timer,
      };

    case 'moveTracker': {
      const list = state.trackers.filter((t) => !t.archived).sort((a, b) => a.order - b.order);
      const i = list.findIndex((t) => t.id === action.id);
      const j = i + action.dir;
      if (i < 0 || j < 0 || j >= list.length) return state;
      [list[i], list[j]] = [list[j], list[i]];
      const order = new Map(list.map((t, idx) => [t.id, idx]));
      return { ...state, trackers: state.trackers.map((t) => (order.has(t.id) ? { ...t, order: order.get(t.id)! } : t)) };
    }

    case 'log': {
      if (action.amount <= 0) return state;
      const entry: Entry = {
        id: newId(),
        trackerId: action.trackerId,
        dateKey: action.dateKey,
        amount: action.amount,
        at: action.nowIso,
        source: action.source,
      };
      return addEntry(state, entry, action.nowIso);
    }

    case 'undoLast': {
      const last = state.entries
        .filter((e) => e.trackerId === action.trackerId && e.dateKey === action.dateKey)
        .sort((a, b) => (a.at < b.at ? -1 : 1))
        .pop();
      return last ? removeEntry(state, last.id, action.nowIso) : state;
    }

    case 'setCheck': {
      const has = amountOn(state.entries, action.trackerId, action.dateKey) > 0;
      if (action.done && !has) {
        return addEntry(
          state,
          { id: newId(), trackerId: action.trackerId, dateKey: action.dateKey, amount: 1, at: action.nowIso, source: 'tap' },
          action.nowIso,
        );
      }
      if (!action.done && has) {
        const next = {
          ...state,
          entries: state.entries.filter((e) => !(e.trackerId === action.trackerId && e.dateKey === action.dateKey)),
        };
        return syncAutoPost(next, action.trackerId, action.dateKey, action.nowIso);
      }
      return state;
    }

    case 'timerStart':
      return { ...state, timer: { trackerId: action.trackerId, startedAt: action.nowMs, accumulatedMs: 0 } };

    case 'timerPause':
      if (!state.timer || state.timer.startedAt === null) return state;
      return { ...state, timer: { ...state.timer, startedAt: null, accumulatedMs: elapsedMs(state.timer, action.nowMs) } };

    case 'timerResume':
      if (!state.timer || state.timer.startedAt !== null) return state;
      return { ...state, timer: { ...state.timer, startedAt: action.nowMs } };

    case 'timerFinish': {
      if (!state.timer) return state;
      const ms = elapsedMs(state.timer, action.nowMs);
      const cleared = { ...state, timer: null };
      if (ms < 30_000) return cleared;
      return addEntry(
        cleared,
        {
          id: newId(),
          trackerId: state.timer.trackerId,
          dateKey: action.dateKey,
          amount: minutesToLog(ms),
          at: action.nowIso,
          source: 'timer',
        },
        action.nowIso,
      );
    }

    case 'timerCancel':
      return { ...state, timer: null };

    case 'addSpace':
      return {
        ...state,
        spaces: [...state.spaces, action.space],
        blocks: [...state.blocks, ...action.blocks],
        trackers: [...state.trackers, ...action.trackers],
      };

    case 'updateSpace':
      return { ...state, spaces: state.spaces.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)) };

    case 'deleteSpace': {
      const ids = new Set(descendantIds(state.spaces, action.id));
      return {
        ...state,
        spaces: state.spaces.filter((s) => !ids.has(s.id)),
        blocks: state.blocks.filter((b) => !ids.has(b.spaceId) && !(b.type === 'folder' && b.childSpaceId && ids.has(b.childSpaceId))),
      };
    }

    case 'addBlock':
      return {
        ...state,
        blocks: [...state.blocks, action.block],
        spaces: action.childSpace ? [...state.spaces, action.childSpace] : state.spaces,
      };

    case 'updateBlock':
      return { ...state, blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)) };

    case 'deleteBlock': {
      const block = state.blocks.find((b) => b.id === action.id);
      if (!block) return state;
      let next: AppData = { ...state, blocks: state.blocks.filter((b) => b.id !== action.id) };
      if (block.type === 'folder' && block.childSpaceId) next = reducer(next, { type: 'deleteSpace', id: block.childSpaceId });
      return next;
    }

    case 'moveBlock':
      return { ...state, blocks: moveBlock(state.blocks, action.id, action.dir) };

    case 'toggleTask': {
      const block = state.blocks.find((b) => b.id === action.id);
      if (!block || block.type !== 'task') return state;
      const done = !block.done;
      let next: AppData = state;
      let loggedEntryId: string | undefined = block.loggedEntryId;
      const tracker = block.trackerId ? state.trackers.find((t) => t.id === block.trackerId) : undefined;
      if (done && tracker && tracker.kind !== 'duration') {
        // Ticking a linked task reports one unit of progress to its tracker.
        const entry: Entry = { id: newId(), trackerId: tracker.id, dateKey: action.dateKey, amount: 1, at: action.nowIso, source: 'task' };
        next = addEntry(next, entry, action.nowIso);
        loggedEntryId = entry.id;
      } else if (!done && block.loggedEntryId) {
        next = removeEntry(next, block.loggedEntryId, action.nowIso);
        loggedEntryId = undefined;
      }
      return { ...next, blocks: next.blocks.map((b) => (b.id === block.id ? { ...b, done, loggedEntryId } : b)) };
    }

    case 'toggleProps':
      return {
        ...state,
        props: state.props.includes(action.postId) ? state.props.filter((p) => p !== action.postId) : [...state.props, action.postId],
      };

    case 'addComment':
      return { ...state, comments: [...state.comments, action.comment] };

    case 'toggleFollow':
      return {
        ...state,
        following: state.following.includes(action.memberId)
          ? state.following.filter((m) => m !== action.memberId)
          : [...state.following, action.memberId],
      };

    case 'addPost':
      return { ...state, posts: [action.post, ...state.posts] };

    case 'deletePost':
      return {
        ...state,
        posts: state.posts.filter((p) => p.id !== action.id),
        comments: state.comments.filter((c) => c.postId !== action.id),
      };

    case 'joinChallenge':
      if (state.challenges.some((c) => c.challengeId === action.join.challengeId)) return state;
      return {
        ...state,
        challenges: [...state.challenges, action.join],
        trackers: action.tracker ? [...state.trackers, action.tracker] : state.trackers,
      };

    case 'leaveChallenge':
      return { ...state, challenges: state.challenges.filter((c) => c.challengeId !== action.challengeId) };

    case 'reset':
      return EMPTY_DATA;

    default:
      return state;
  }
}

/** Accepts stored data from any earlier version and fills in missing fields. */
export function migrate(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') return EMPTY_DATA;
  const r = raw as Partial<AppData>;
  const arr = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : []);
  return {
    version: 1,
    profile: r.profile ?? null,
    trackers: arr(r.trackers),
    entries: arr(r.entries),
    spaces: arr(r.spaces),
    blocks: arr(r.blocks),
    posts: arr(r.posts),
    props: arr(r.props),
    comments: arr(r.comments),
    following: arr(r.following),
    challenges: arr(r.challenges),
    timer: r.timer ?? null,
  };
}
