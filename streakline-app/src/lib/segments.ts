import type { SegmentId, TrackerKind } from './types';

export interface TrackerTemplate {
  name: string;
  emoji: string;
  kind: TrackerKind;
  target: number;
}

export interface Segment {
  id: SegmentId;
  name: string;
  emoji: string;
  color: string;
  blurb: string;
  templates: TrackerTemplate[];
}

/**
 * Segments are the "sports" of Streakline: communities of people building
 * the same kind of consistency. Each comes with ready-made trackers.
 */
export const SEGMENTS: Segment[] = [
  {
    id: 'focus',
    name: 'Deep Focus',
    emoji: '🎧',
    color: '#4ADE80',
    blurb: 'Distraction-free deep work blocks',
    templates: [
      { name: 'Deep work', emoji: '🎧', kind: 'duration', target: 90 },
      { name: 'Morning without phone', emoji: '📵', kind: 'check', target: 1 },
      { name: 'Single-task sprints', emoji: '⏱️', kind: 'count', target: 3 },
    ],
  },
  {
    id: 'ideation',
    name: 'Ideation',
    emoji: '💡',
    color: '#FACC15',
    blurb: 'One protected hour a day for ideas',
    templates: [
      { name: 'Ideation hour', emoji: '💡', kind: 'duration', target: 60 },
      { name: 'Capture 3 ideas', emoji: '🗒️', kind: 'count', target: 3 },
      { name: 'Sketch', emoji: '✏️', kind: 'duration', target: 20 },
    ],
  },
  {
    id: 'study',
    name: 'Study',
    emoji: '📚',
    color: '#60A5FA',
    blurb: 'Courses, exams and learning streaks',
    templates: [
      { name: 'Study session', emoji: '📚', kind: 'duration', target: 120 },
      { name: 'Flashcards', emoji: '🃏', kind: 'check', target: 1 },
      { name: 'Practice problems', emoji: '🧮', kind: 'count', target: 10 },
    ],
  },
  {
    id: 'research',
    name: 'Research',
    emoji: '🔬',
    color: '#C084FC',
    blurb: 'Reading, experiments and writing it up',
    templates: [
      { name: 'Read papers', emoji: '📄', kind: 'count', target: 2 },
      { name: 'Research notes', emoji: '🧪', kind: 'duration', target: 30 },
      { name: 'Write 500 words', emoji: '✍️', kind: 'check', target: 1 },
    ],
  },
  {
    id: 'fitness',
    name: 'Fitness',
    emoji: '🏋️',
    color: '#FB923C',
    blurb: 'Training, steps and mobility',
    templates: [
      { name: 'Workout', emoji: '🏋️', kind: 'check', target: 1 },
      { name: 'Steps 8k', emoji: '👟', kind: 'check', target: 1 },
      { name: 'Mobility', emoji: '🧘', kind: 'duration', target: 15 },
    ],
  },
  {
    id: 'sleep',
    name: 'Sleep & Recovery',
    emoji: '🌙',
    color: '#7DD3FC',
    blurb: 'Consistent sleep, real recovery',
    templates: [
      { name: 'Sleep 7+ hrs', emoji: '😴', kind: 'check', target: 1 },
      { name: 'In bed by 11', emoji: '🛏️', kind: 'check', target: 1 },
      { name: 'Wind-down', emoji: '🌙', kind: 'duration', target: 20 },
    ],
  },
  {
    id: 'custom',
    name: 'Personal',
    emoji: '✨',
    color: '#E5E5EA',
    blurb: 'Anything else you want to keep',
    templates: [
      { name: 'Make bed', emoji: '🛏️', kind: 'check', target: 1 },
      { name: 'Water', emoji: '💧', kind: 'count', target: 8 },
      { name: 'Gratitude', emoji: '🙏', kind: 'check', target: 1 },
    ],
  },
];

export function getSegment(id: SegmentId): Segment {
  return SEGMENTS.find((s) => s.id === id) ?? SEGMENTS[SEGMENTS.length - 1];
}

export const EMOJI_CHOICES = [
  '🎧', '💡', '📚', '🔬', '🏋️', '🌙', '😴', '📵', '✍️', '📄', '🧪', '🧮',
  '🃏', '🗒️', '✏️', '👟', '🧘', '🏃', '🚴', '🏊', '💧', '🥗', '💊', '🙏',
  '🛏️', '🧠', '🎨', '🎸', '📷', '🗣️', '💻', '📈', '🌱', '☀️', '⏱️', '🔥',
  '📁', '🗂️', '🚀', '🎯', '🧩', '📝',
];
