/**
 * Short, home-friendly strength workouts (bodyweight or light dumbbells).
 * Every exercise has a low-energy version for days when side effects hit.
 */

export interface ExerciseVariant {
  name: string;
  prescription: string;
}

export interface Exercise {
  id: string;
  cue: string;
  standard: ExerciseVariant;
  low: ExerciseVariant;
}

export interface Workout {
  id: string;
  name: string;
  focus: string;
  minutes: number;
  lowMinutes: number;
  exercises: Exercise[];
}

export const WORKOUTS: Workout[] = [
  {
    id: 'A',
    name: 'Workout A',
    focus: 'Legs and push',
    minutes: 20,
    lowMinutes: 12,
    exercises: [
      {
        id: 'squat',
        cue: 'Sit back like into a chair, chest tall, push the floor away.',
        standard: { name: 'Goblet squat', prescription: '3 × 8–12' },
        low: { name: 'Chair sit-to-stand', prescription: '2 × 8' },
      },
      {
        id: 'pushup',
        cue: 'Body in one straight line, lower your chest to the edge.',
        standard: { name: 'Incline push-up', prescription: '3 × 6–12' },
        low: { name: 'Wall push-up', prescription: '2 × 10' },
      },
      {
        id: 'bridge',
        cue: 'Squeeze your glutes at the top and pause for a second.',
        standard: { name: 'Glute bridge', prescription: '3 × 12' },
        low: { name: 'Glute bridge', prescription: '2 × 10' },
      },
      {
        id: 'row',
        cue: 'Pull your elbow towards your back pocket.',
        standard: { name: 'One-arm dumbbell row', prescription: '3 × 10 each side' },
        low: { name: 'Light band row', prescription: '2 × 10' },
      },
      {
        id: 'carry',
        cue: 'Stand tall, shoulders down, walk slowly.',
        standard: { name: 'Farmer carry', prescription: '3 × 30 s' },
        low: { name: 'Suitcase hold', prescription: '2 × 20 s' },
      },
    ],
  },
  {
    id: 'B',
    name: 'Workout B',
    focus: 'Hinge and pull',
    minutes: 20,
    lowMinutes: 12,
    exercises: [
      {
        id: 'rdl',
        cue: 'Push your hips back with a flat back; feel the stretch in your hamstrings.',
        standard: { name: 'Dumbbell Romanian deadlift', prescription: '3 × 10' },
        low: { name: 'Hip hinge, no weight', prescription: '2 × 10' },
      },
      {
        id: 'split',
        cue: 'Drop the back knee straight down, front heel stays planted.',
        standard: { name: 'Split squat', prescription: '3 × 8 each side' },
        low: { name: 'Supported split squat', prescription: '2 × 6 each side' },
      },
      {
        id: 'press',
        cue: 'Brace your core and press straight overhead.',
        standard: { name: 'Dumbbell overhead press', prescription: '3 × 8–10' },
        low: { name: 'Seated light press', prescription: '2 × 8' },
      },
      {
        id: 'pullapart',
        cue: 'Arms straight, squeeze your shoulder blades together.',
        standard: { name: 'Band pull-apart', prescription: '3 × 15' },
        low: { name: 'Band pull-apart', prescription: '2 × 12' },
      },
      {
        id: 'deadbug',
        cue: 'Lower back stays pressed into the floor.',
        standard: { name: 'Dead bug', prescription: '3 × 8 each side' },
        low: { name: 'Dead bug, arms only', prescription: '2 × 6 each side' },
      },
    ],
  },
  {
    id: 'C',
    name: 'Workout C',
    focus: 'Full body',
    minutes: 20,
    lowMinutes: 12,
    exercises: [
      {
        id: 'stepup',
        cue: 'Drive through the whole foot on the step.',
        standard: { name: 'Step-up', prescription: '3 × 8 each side' },
        low: { name: 'Low step-up', prescription: '2 × 6 each side' },
      },
      {
        id: 'floorpress',
        cue: 'Lower slowly until your elbows touch the floor.',
        standard: { name: 'Dumbbell floor press', prescription: '3 × 10' },
        low: { name: 'Light floor press', prescription: '2 × 10' },
      },
      {
        id: 'lunge',
        cue: 'Step back softly and keep your torso upright.',
        standard: { name: 'Reverse lunge', prescription: '3 × 8 each side' },
        low: { name: 'Assisted reverse lunge', prescription: '2 × 6 each side' },
      },
      {
        id: 'plank',
        cue: 'Squeeze glutes, breathe steadily.',
        standard: { name: 'Plank', prescription: '3 × 30 s' },
        low: { name: 'Incline plank', prescription: '2 × 20 s' },
      },
      {
        id: 'calf',
        cue: 'Rise all the way up, lower slowly.',
        standard: { name: 'Calf raise', prescription: '3 × 15' },
        low: { name: 'Supported calf raise', prescription: '2 × 12' },
      },
    ],
  },
];

export function getWorkout(id: string | undefined): Workout {
  return WORKOUTS.find((w) => w.id === id) ?? WORKOUTS[0];
}
