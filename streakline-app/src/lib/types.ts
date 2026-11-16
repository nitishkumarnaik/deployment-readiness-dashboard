export type SegmentId = 'fitness' | 'study' | 'research' | 'ideation' | 'focus' | 'sleep' | 'custom';

/** check: done or not · count: N times a day · duration: minutes a day */
export type TrackerKind = 'check' | 'count' | 'duration';
export type Visibility = 'public' | 'private';

export interface Tracker {
  id: string;
  name: string;
  emoji: string;
  segment: SegmentId;
  kind: TrackerKind;
  /** Daily goal: 1 for check, times for count, minutes for duration. */
  target: number;
  visibility: Visibility;
  order: number;
  archived: boolean;
  createdOn: string;
}

export interface Entry {
  id: string;
  trackerId: string;
  dateKey: string;
  /** 1 for check, times for count, minutes for duration. */
  amount: number;
  at: string;
  source: 'tap' | 'timer' | 'manual' | 'task';
}

/** A folder the user designs: an ordered board of blocks. */
export interface Space {
  id: string;
  name: string;
  emoji: string;
  parentId: string | null;
  /** 1 = list, 2 or 3 = grid columns. */
  columns: 1 | 2 | 3;
  order: number;
  createdAt: string;
}

export type BlockType = 'tracker' | 'note' | 'task' | 'heading' | 'folder';
export type BlockSize = 'small' | 'wide';

export interface Block {
  id: string;
  spaceId: string;
  type: BlockType;
  size: BlockSize;
  order: number;
  title: string;
  body?: string;
  done?: boolean;
  /** tracker blocks, and tasks that report progress to a tracker */
  trackerId?: string;
  /** entry created when a linked task was ticked, so un-ticking can undo it */
  loggedEntryId?: string;
  /** folder blocks */
  childSpaceId?: string;
  createdAt: string;
}

export interface Profile {
  name: string;
  handle: string;
  emoji: string;
  startedOn: string;
  /** Post to the feed automatically when a public tracker hits its daily goal. */
  autoShare: boolean;
}

export interface Member {
  id: string;
  name: string;
  handle: string;
  emoji: string;
  /** Sample members power the preview community until accounts go live. */
  sample: boolean;
  segments: SegmentId[];
}

export interface Post {
  id: string;
  authorId: string;
  trackerId?: string;
  trackerName: string;
  emoji: string;
  segment: SegmentId;
  dateKey: string;
  at: string;
  headline: string;
  streak: number;
  caption?: string;
  /** Created automatically from a completed goal (removed again if the goal is undone). */
  auto?: boolean;
  /** Last 7 days, oldest first: 0 none, 1 partial, 2 complete. */
  week?: number[];
  sampleProps?: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  at: string;
}

export interface ActiveTimer {
  trackerId: string;
  /** epoch ms when the current run started; null while paused */
  startedAt: number | null;
  accumulatedMs: number;
}

export interface ChallengeJoin {
  challengeId: string;
  joinedOn: string;
  trackerId: string;
}

export interface AppData {
  version: 1;
  profile: Profile | null;
  trackers: Tracker[];
  entries: Entry[];
  spaces: Space[];
  blocks: Block[];
  posts: Post[];
  props: string[];
  comments: Comment[];
  following: string[];
  challenges: ChallengeJoin[];
  timer: ActiveTimer | null;
}

export const ME = 'me';

export const EMPTY_DATA: AppData = {
  version: 1,
  profile: null,
  trackers: [],
  entries: [],
  spaces: [],
  blocks: [],
  posts: [],
  props: [],
  comments: [],
  following: [],
  challenges: [],
  timer: null,
};
