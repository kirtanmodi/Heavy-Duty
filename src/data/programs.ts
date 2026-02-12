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
        focus: 'Chest, Shoulders, Triceps',
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
        focus: 'Back, Traps, Biceps',
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
        focus: 'Legs, Abs',
        exercises: [
          'leg-extension',
          'leg-press',
          'romanian-deadlift',
          'leg-curl',
          'calf-raise',
          'hanging-leg-raise',
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

export function getProgram(id: string): Program | undefined {
  return programMap.get(id)
}
