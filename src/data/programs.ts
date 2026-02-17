import type { Program } from '../types'

export const programs: Program[] = [
  {
    id: 'heavy-duty-complete',
    name: 'Heavy Duty Complete',
    shortName: 'Program A',
    description: 'The full Mentzer plan with pre-exhaust supersets, cardio days, and weekly structure. Recommended for maximum results.',
    recommended: true,
    days: [
      {
        id: 'hd-monday',
        name: 'Day 1 — Chest, Shoulders, Triceps',
        type: 'lift',
        dayOfWeek: 1,
        focus: 'Push',
        exercises: [
          'dumbbell-flyes',
          'incline-bench-press',
          'overhead-press',
          'side-lateral-raise',
          'tricep-pushdown',
          'weighted-dips',
        ],
        supersets: [
          ['dumbbell-flyes', 'incline-bench-press'],
          ['tricep-pushdown', 'weighted-dips'],
        ],
      },
      {
        id: 'hd-tuesday',
        name: 'Tuesday — Zone 2 Cardio',
        type: 'cardio',
        dayOfWeek: 2,
        focus: 'Zone 2 Cardio',
        exercises: [],
        supersets: [],
        description: 'Cycling or elliptical at a steady, conversational pace. Keep heart rate in Zone 2 (120-140 BPM).',
        duration: '30-40 min',
        tips: 'This is the #1 thing you can do for heart health and longevity. Easy pace — you should be able to hold a conversation.',
      },
      {
        id: 'hd-wednesday',
        name: 'Day 2 — Back, Traps, Biceps',
        type: 'lift',
        dayOfWeek: 3,
        focus: 'Pull',
        exercises: [
          'dumbbell-pullover',
          'lat-pulldown',
          'barbell-row',
          'barbell-shrugs',
          'barbell-curl',
        ],
        supersets: [
          ['dumbbell-pullover', 'lat-pulldown'],
        ],
      },
      {
        id: 'hd-thursday',
        name: 'Thursday — Interval Cardio',
        type: 'cardio',
        dayOfWeek: 4,
        focus: 'Interval Cardio',
        exercises: [],
        supersets: [],
        description: '30 seconds hard effort / 90 seconds easy recovery. Repeat 8-10 rounds.',
        duration: '20-25 min',
        tips: 'Improves VO2 max and stamina. Push hard on the work intervals — this is where you build endurance.',
      },
      {
        id: 'hd-friday',
        name: 'Day 3 — Legs, Abs',
        type: 'lift',
        dayOfWeek: 5,
        focus: 'Legs & Abs',
        exercises: [
          'leg-extension',
          'leg-press',
          'romanian-deadlift',
          'leg-curl',
          'calf-raise',
          'hanging-leg-raise',
          'cable-crunch',
        ],
        supersets: [
          ['leg-extension', 'leg-press'],
        ],
      },
      {
        id: 'hd-saturday',
        name: 'Saturday — Active Recovery',
        type: 'recovery',
        dayOfWeek: 6,
        focus: 'Active Recovery',
        exercises: [],
        supersets: [],
        description: 'Incline treadmill walk (8-12% incline, 5-6 km/h) followed by foam rolling and stretching.',
        duration: '30-40 min',
        tips: 'This helps recovery and burns extra calories without taxing your muscles. Focus on stretching tight areas.',
      },
      {
        id: 'hd-sunday',
        name: 'Sunday — Full Rest',
        type: 'rest',
        dayOfWeek: 0,
        focus: 'Full Rest',
        exercises: [],
        supersets: [],
        description: 'Do nothing. Your muscles grow during rest, not in the gym.',
        tips: 'Sleep 7-8 hours. Eat high protein. Let your body rebuild.',
      },
    ],
  },
]

export const programMap = new Map(programs.map(p => [p.id, p]))

export interface CardioActivity {
  name: string
  note: string
}

export const cardioActivities: Record<string, CardioActivity[]> = {
  'hd-tuesday': [
    { name: 'Incline treadmill walk', note: '10-15% grade, 2.5-3.5 mph' },
    { name: 'Stationary bike', note: '70-90 RPM, moderate resistance' },
    { name: 'Rowing machine (steady)', note: '2:00-2:30 /500m pace' },
    { name: 'Elliptical', note: 'Incline 6-8, resistance 5-7' },
    { name: 'Brisk walk / light jog', note: '3.5-4.5 mph outdoors' },
    { name: 'Stair climber (slow)', note: '50-65 steps/min' },
    { name: 'Swimming (easy laps)', note: 'Continuous freestyle, low effort' },
    { name: 'Outdoor cycling (flat)', note: '12-15 mph, no surges' },
  ],
  'hd-thursday': [
    { name: 'Assault / air bike sprints', note: 'Arms + legs, max effort' },
    { name: 'Rowing machine intervals', note: '30s at 1:30-1:45 /500m pace' },
    { name: 'SkiErg sprints', note: 'Upper back, lats, core' },
    { name: 'Stationary bike sprints', note: '110+ RPM, high resistance' },
    { name: 'Treadmill sprints', note: '8-12 mph for 30s, walk 3 mph rest' },
    { name: 'Battle rope slams', note: 'Alternating waves or double slams' },
    { name: 'Jump rope sprints', note: 'Max-speed singles or double-unders' },
    { name: 'Burpee intervals', note: '6-10 per 30s round, no equipment' },
    { name: 'Kettlebell swings', note: 'Heavy two-hand, hip hinge' },
  ],
  'hd-saturday': [
    { name: 'Foam rolling (full body)', note: '30-60s per muscle group' },
    { name: 'Slow walking', note: '2.0-3.0 mph flat, 15-20 min' },
    { name: 'Hip 90/90 stretching', note: '60-90s per side, internal/external rotation' },
    { name: 'Cat-cow + thoracic rotations', note: '10 each + 10 thread-the-needle per side' },
    { name: 'Dead hang', note: '20-30s × 3-4 sets, decompresses spine' },
    { name: 'Light yoga (sun salutations)', note: '5-8 rounds at breath pace' },
    { name: 'Couch stretch', note: 'Kneel against wall, 2-3 min per side' },
    { name: 'Easy stationary bike', note: '15-20 min, minimal resistance, HR <100' },
    { name: 'Banded pull-aparts', note: '3×20 light band, scapular health' },
    { name: 'Deep squat hold', note: '60-90s bodyweight, ankle/hip mobility' },
  ],
}

export function getProgram(id: string): Program | undefined {
  return programMap.get(id)
}
