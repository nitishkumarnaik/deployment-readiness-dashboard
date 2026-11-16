import { newId } from './id';
import { getSegment } from './segments';
import type { Block, BlockType, SegmentId, Space, Tracker } from './types';

export function childSpaces(spaces: Space[], parentId: string | null): Space[] {
  return spaces.filter((s) => s.parentId === parentId).sort((a, b) => a.order - b.order);
}

export function spaceBlocks(blocks: Block[], spaceId: string): Block[] {
  return blocks.filter((b) => b.spaceId === spaceId).sort((a, b) => a.order - b.order);
}

/** Every space under `spaceId` (children, grandchildren…), including itself. */
export function descendantIds(spaces: Space[], spaceId: string): string[] {
  const out = [spaceId];
  for (let i = 0; i < out.length; i++) {
    for (const s of spaces) if (s.parentId === out[i]) out.push(s.id);
  }
  return out;
}

/** Breadcrumb from the top-level space down to `spaceId`. */
export function pathTo(spaces: Space[], spaceId: string): Space[] {
  const path: Space[] = [];
  let current = spaces.find((s) => s.id === spaceId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? spaces.find((s) => s.id === current!.parentId) : undefined;
  }
  return path;
}

/** Swap a block with its neighbour inside the same space. Returns a new array. */
export function moveBlock(blocks: Block[], blockId: string, dir: -1 | 1): Block[] {
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return blocks;
  const siblings = spaceBlocks(blocks, block.spaceId);
  const i = siblings.findIndex((b) => b.id === blockId);
  const j = i + dir;
  if (j < 0 || j >= siblings.length) return blocks;
  const reordered = [...siblings];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  const orderOf = new Map(reordered.map((b, idx) => [b.id, idx]));
  return blocks.map((b) => (orderOf.has(b.id) ? { ...b, order: orderOf.get(b.id)! } : b));
}

export function nextOrder(items: { order: number }[]): number {
  return items.reduce((m, x) => Math.max(m, x.order + 1), 0);
}

export interface SpaceSummary {
  trackers: number;
  notes: number;
  tasks: number;
  tasksDone: number;
  folders: number;
}

export function summarize(blocks: Block[], spaceId: string): SpaceSummary {
  const own = spaceBlocks(blocks, spaceId);
  return {
    trackers: own.filter((b) => b.type === 'tracker').length,
    notes: own.filter((b) => b.type === 'note').length,
    tasks: own.filter((b) => b.type === 'task').length,
    tasksDone: own.filter((b) => b.type === 'task' && b.done).length,
    folders: own.filter((b) => b.type === 'folder').length,
  };
}

export function describeSummary(s: SpaceSummary): string {
  const parts: string[] = [];
  if (s.trackers) parts.push(`${s.trackers} tracker${s.trackers === 1 ? '' : 's'}`);
  if (s.tasks) parts.push(`${s.tasksDone}/${s.tasks} tasks`);
  if (s.notes) parts.push(`${s.notes} note${s.notes === 1 ? '' : 's'}`);
  if (s.folders) parts.push(`${s.folders} folder${s.folders === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' · ') : 'Empty';
}

/* ---------- Templates ---------- */

type TemplateBlock =
  | { type: 'heading'; title: string }
  | { type: 'note'; title: string; body: string; size?: 'small' | 'wide' }
  | { type: 'task'; title: string; tracker?: string }
  | { type: 'tracker'; tracker: string };

export interface SpaceTemplate {
  id: string;
  name: string;
  emoji: string;
  segment: SegmentId;
  columns: 1 | 2 | 3;
  description: string;
  blocks: TemplateBlock[];
}

export const SPACE_TEMPLATES: SpaceTemplate[] = [
  {
    id: 'ideation-lab',
    name: 'Ideation lab',
    emoji: '💡',
    segment: 'ideation',
    columns: 2,
    description: 'An hour a day for ideas, an inbox to catch them, and a next step.',
    blocks: [
      { type: 'tracker', tracker: 'Ideation hour' },
      { type: 'tracker', tracker: 'Capture 3 ideas' },
      { type: 'note', title: 'Idea inbox', body: 'Dump every idea here. Sort later.', size: 'wide' },
      { type: 'heading', title: 'This week' },
      { type: 'task', title: 'Pick one idea to prototype', tracker: 'Capture 3 ideas' },
      { type: 'task', title: 'Show it to 3 people' },
    ],
  },
  {
    id: 'research-hub',
    name: 'Research hub',
    emoji: '🔬',
    segment: 'research',
    columns: 2,
    description: 'Reading streak, notes and the questions that drive the project.',
    blocks: [
      { type: 'tracker', tracker: 'Read papers' },
      { type: 'tracker', tracker: 'Research notes' },
      { type: 'note', title: 'Open questions', body: '1. \n2. \n3. ', size: 'wide' },
      { type: 'heading', title: 'Milestones' },
      { type: 'task', title: 'Literature review', tracker: 'Read papers' },
      { type: 'task', title: 'First draft of methods' },
    ],
  },
  {
    id: 'study-plan',
    name: 'Study plan',
    emoji: '📚',
    segment: 'study',
    columns: 2,
    description: 'Daily study time, practice and exam countdown tasks.',
    blocks: [
      { type: 'tracker', tracker: 'Study session' },
      { type: 'tracker', tracker: 'Flashcards' },
      { type: 'heading', title: 'Syllabus' },
      { type: 'task', title: 'Chapter 1', tracker: 'Study session' },
      { type: 'task', title: 'Chapter 2' },
      { type: 'task', title: 'Mock exam' },
    ],
  },
  {
    id: 'deep-work',
    name: 'Deep work',
    emoji: '🎧',
    segment: 'focus',
    columns: 2,
    description: 'Protect focus: daily deep-work target and a phone-free morning.',
    blocks: [
      { type: 'tracker', tracker: 'Deep work' },
      { type: 'tracker', tracker: 'Morning without phone' },
      { type: 'note', title: 'Focus rules', body: 'Phone in another room. One tab. One task.', size: 'wide' },
    ],
  },
  {
    id: 'training-block',
    name: 'Training block',
    emoji: '🏋️',
    segment: 'fitness',
    columns: 3,
    description: 'Train, move and recover, all on one board.',
    blocks: [
      { type: 'tracker', tracker: 'Workout' },
      { type: 'tracker', tracker: 'Steps 8k' },
      { type: 'tracker', tracker: 'Sleep 7+ hrs' },
      { type: 'note', title: 'Program', body: 'Mon: push · Wed: pull · Fri: legs', size: 'wide' },
    ],
  },
  {
    id: 'blank',
    name: 'Blank space',
    emoji: '📁',
    segment: 'custom',
    columns: 2,
    description: 'Start empty and design it yourself.',
    blocks: [],
  },
];

/** Finds a tracker template by name across all segments. */
function findTemplate(name: string) {
  for (const segId of ['focus', 'ideation', 'study', 'research', 'fitness', 'sleep', 'custom'] as SegmentId[]) {
    const seg = getSegment(segId);
    const t = seg.templates.find((x) => x.name === name);
    if (t) return { ...t, segment: segId };
  }
  return null;
}

export interface BuiltSpace {
  space: Space;
  blocks: Block[];
  newTrackers: Tracker[];
}

/**
 * Builds a space from a template. Trackers the user already has (same name)
 * are reused; missing ones are created.
 */
export function buildFromTemplate(
  template: SpaceTemplate,
  opts: { name?: string; emoji?: string; parentId?: string | null; existing: Tracker[]; today: string; nowIso: string; order: number; trackerOrderStart: number },
): BuiltSpace {
  const space: Space = {
    id: newId(),
    name: opts.name?.trim() || template.name,
    emoji: opts.emoji ?? template.emoji,
    parentId: opts.parentId ?? null,
    columns: template.columns,
    order: opts.order,
    createdAt: opts.nowIso,
  };
  const newTrackers: Tracker[] = [];
  const trackerFor = (name: string): Tracker | undefined => {
    const found = [...opts.existing, ...newTrackers].find((t) => t.name === name && !t.archived);
    if (found) return found;
    const tpl = findTemplate(name);
    if (!tpl) return undefined;
    const t: Tracker = {
      id: newId(),
      name: tpl.name,
      emoji: tpl.emoji,
      segment: tpl.segment,
      kind: tpl.kind,
      target: tpl.target,
      visibility: 'public',
      order: opts.trackerOrderStart + newTrackers.length,
      archived: false,
      createdOn: opts.today,
    };
    newTrackers.push(t);
    return t;
  };

  const blocks: Block[] = [];
  template.blocks.forEach((tb, i) => {
    const base = { id: newId(), spaceId: space.id, order: i, createdAt: opts.nowIso };
    if (tb.type === 'tracker') {
      const t = trackerFor(tb.tracker);
      if (t) blocks.push({ ...base, type: 'tracker', size: 'small', title: t.name, trackerId: t.id });
    } else if (tb.type === 'task') {
      const t = tb.tracker ? trackerFor(tb.tracker) : undefined;
      blocks.push({ ...base, type: 'task', size: 'wide', title: tb.title, done: false, trackerId: t?.id });
    } else if (tb.type === 'note') {
      blocks.push({ ...base, type: 'note', size: tb.size ?? 'small', title: tb.title, body: tb.body });
    } else {
      blocks.push({ ...base, type: 'heading', size: 'wide', title: tb.title });
    }
  });
  return { space, blocks, newTrackers };
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  tracker: 'Tracker',
  note: 'Note',
  task: 'Task',
  heading: 'Heading',
  folder: 'Folder',
};
