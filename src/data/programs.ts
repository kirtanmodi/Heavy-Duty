import type { Exercise, Program } from '../types'

export const programs: Program[] = [
  {
    id: 'heavy-duty-complete',
    name: 'Heavy Duty Complete',
    shortName: 'Program A',
    description: 'The full Mentzer plan. Three lift days with cardio, recovery and rest in an 8-day cycle.',
    recommended: true,
    days: [
      {
        id: 'hd-monday',
        name: 'Chest, Shoulders, Triceps, Abs',
        type: 'lift',
        dayOfWeek: 0,
        focus: 'Push',
        // Front delts are trained by the incline press; side and rear delts get
        // direct work so all three heads are covered. Every lift day ends with
        // abs (trained last so they're fresh as stabilisers for the big lifts).
        exercises: [
          'dumbbell-flyes',
          'incline-bench-press',
          'side-lateral-raise',
          'rear-delt-fly',
          'tricep-pushdown',
          'hanging-leg-raise',
        ],
      },
      {
        id: 'hd-rest-1',
        name: 'Rest',
        type: 'rest',
        dayOfWeek: 0,
        focus: 'Full rest',
        exercises: [],
        description: 'Muscles grow during rest, not in the gym. Wait at least 48 hours between lifts.',
        tips: 'Sleep 7-8 hours and eat plenty of protein.',
      },
      {
        id: 'hd-wednesday',
        name: 'Back, Traps, Biceps, Abs',
        type: 'lift',
        dayOfWeek: 0,
        focus: 'Pull',
        exercises: [
          'dumbbell-pullover',
          'lat-pulldown',
          'barbell-row',
          'barbell-shrugs',
          'barbell-curl',
          'cable-crunch',
        ],
      },
      {
        id: 'hd-rest-2',
        name: 'Rest',
        type: 'rest',
        dayOfWeek: 0,
        focus: 'Full rest',
        exercises: [],
        description: 'Muscles grow during rest, not in the gym. Wait at least 48 hours between lifts.',
        tips: 'Sleep 7-8 hours and eat plenty of protein.',
      },
      {
        id: 'hd-friday',
        name: 'Legs, Side Delts, Abs',
        type: 'lift',
        dayOfWeek: 0,
        focus: 'Legs & Abs',
        // Side delts get a second weekly hit here (shoulder width drives the
        // V-taper). Leg day sits 4 days from Push either way, so it doesn't
        // collide with Push's shoulder work.
        exercises: [
          'leg-extension',
          'leg-press',
          'leg-curl',
          'calf-raise',
          'cable-lateral-raise',
          'cable-crunch',
        ],
      },
      {
        id: 'hd-cardio',
        name: 'Cardio',
        type: 'cardio',
        dayOfWeek: 0,
        focus: 'Cardio',
        exercises: [],
        description: 'Pick steady zone 2 cardio for heart health, or intervals for VO2 max.',
        duration: '20-40 min',
        tips: 'Zone 2 is a pace where you can still talk, about 120-140 BPM. For intervals, go hard for 30s and easy for 90s, for 8-10 rounds. You can finish with 2 easy sets of planks or dead bugs. Stop short of failure, because the hard ab work is on lift days.',
      },
      {
        id: 'hd-saturday',
        name: 'Active recovery',
        type: 'recovery',
        dayOfWeek: 0,
        focus: 'Active recovery',
        exercises: [],
        description: 'Walk on an incline treadmill (8-12% incline, 5-6 km/h), then foam roll and stretch.',
        duration: '30-40 min',
        tips: 'This helps you recover and burns extra calories without tiring your muscles. Spend more time on tight areas. You can add 2 easy sets of dead bugs or side planks. Do not go to failure.',
      },
      {
        id: 'hd-rest-3',
        name: 'Rest',
        type: 'rest',
        dayOfWeek: 0,
        focus: 'Full rest',
        exercises: [],
        description: 'Do nothing. Your muscles grow during rest, not in the gym.',
        tips: 'Sleep 7-8 hours and eat plenty of protein.',
      },
    ],
  },
]

// Default session size for every lift day (5 main lifts + abs). Users can still
// add exercises mid-session; extras just aren't carried into the next
// session's defaults.
export const MAX_DEFAULT_EXERCISES = 6

/**
 * Picks the exercise IDs a new session starts with. Each program exercise is a
 * slot for one muscle. A slot keeps last session's pick when it's the same
 * exercise or a swap with the same primary muscle (preferring the same
 * compound/isolation type), so swaps and order carry over. An unfilled slot
 * gets the program exercise back, so a body part that was removed or swapped
 * away is never dropped for good. Last-session exercises that fill no slot
 * (mid-session extras, retired program exercises) aren't carried over.
 */
export function getDefaultExerciseIds(
  programExerciseIds: string[],
  lastSessionExerciseIds: string[] | undefined,
  resolveExercise: (id: string) => Exercise | undefined,
): string[] {
  const slots = programExerciseIds.slice(0, MAX_DEFAULT_EXERCISES)
  const last = [...new Set(lastSessionExerciseIds ?? [])]
  if (last.length === 0) return slots

  const filled = slots.map((id) => (last.includes(id) ? id : undefined))
  const used = new Set(filled.filter((id): id is string => id !== undefined))

  slots.forEach((id, slot) => {
    if (filled[slot]) return
    const target = resolveExercise(id)
    if (!target) return
    const swaps = last.filter((candidate) => (
      !used.has(candidate) && resolveExercise(candidate)?.primaryMuscles[0] === target.primaryMuscles[0]
    ))
    const swap = swaps.find((candidate) => resolveExercise(candidate)?.type === target.type) ?? swaps[0]
    if (swap) {
      filled[slot] = swap
      used.add(swap)
    }
  })

  // Carried-over picks keep last session's order; a restored slot goes right
  // after whatever fills the slot before it.
  const ordered = last.filter((id) => used.has(id))
  slots.forEach((id, slot) => {
    if (filled[slot] || !resolveExercise(id)) return
    let insertAt = 0
    for (let prev = slot - 1; prev >= 0; prev--) {
      const prevId = filled[prev]
      if (prevId) {
        insertAt = ordered.indexOf(prevId) + 1
        break
      }
    }
    ordered.splice(insertAt, 0, id)
    filled[slot] = id
  })
  return ordered
}

export const programMap = new Map(programs.map(p => [p.id, p]))

/** A logged session's title. Older history entries carry a "Day N — " prefix, which is dropped. */
export function getSessionTitle(dayName: string): string {
  return dayName.replace(/^Day\s+\d+\s*[—–-]\s*/, '') || dayName
}

export interface CardioActivity {
  name: string
  note: string
}

export const cardioActivities: Record<string, CardioActivity[]> = {
  'hd-cardio': [
    { name: 'Incline treadmill walk', note: '10-15% incline, 4-5.5 km/h' },
    { name: 'Stationary bike', note: '70-90 RPM, moderate resistance' },
    { name: 'Rowing machine (steady)', note: '2:00-2:30 per 500m' },
    { name: 'Elliptical', note: 'Incline 6-8, resistance 5-7' },
    { name: 'Brisk walk or light jog', note: '5.5-7 km/h outdoors' },
    { name: 'Stair climber (slow)', note: '50-65 steps per minute' },
    { name: 'Swimming (easy laps)', note: 'Continuous freestyle, low effort' },
    { name: 'Outdoor cycling (flat)', note: '19-24 km/h, steady pace' },
    { name: 'Air bike sprints', note: 'Arms and legs, max effort' },
    { name: 'Rowing machine intervals', note: '30s at 1:30-1:45 per 500m' },
    { name: 'SkiErg sprints', note: 'Upper back, lats, core' },
    { name: 'Stationary bike sprints', note: '110+ RPM, high resistance' },
    { name: 'Treadmill sprints', note: '13-19 km/h for 30s, then walk at 5 km/h' },
    { name: 'Battle rope slams', note: 'Alternating waves or double slams' },
    { name: 'Jump rope sprints', note: 'Max-speed singles or double-unders' },
    { name: 'Burpee intervals', note: '6-10 per 30s round, no equipment' },
    { name: 'Kettlebell swings', note: 'Heavy two-hand, hip hinge' },
  ],
  'hd-saturday': [
    { name: 'Foam rolling (full body)', note: '30-60s per muscle group' },
    { name: 'Slow walking', note: '3-5 km/h on flat ground, 15-20 min' },
    { name: 'Hip 90/90 stretching', note: '60-90s per side, inner and outer rotation' },
    { name: 'Cat-cow and upper back rotations', note: '10 of each, plus 10 thread-the-needle per side' },
    { name: 'Dead hang', note: '3-4 sets of 20-30s to take load off the spine' },
    { name: 'Light yoga (sun salutations)', note: '5-8 rounds at breath pace' },
    { name: 'Couch stretch', note: 'Kneel against a wall, 2-3 min per side' },
    { name: 'Easy stationary bike', note: '15-20 min, low resistance, heart rate under 100' },
    { name: 'Banded pull-aparts', note: '3 sets of 20 with a light band, for shoulder blade health' },
    { name: 'Deep squat hold', note: '60-90s, for ankle and hip mobility' },
  ],
  'hd-sunday': [
    { name: 'Sleep in', note: 'Aim for 8-9 hours total' },
    { name: 'Gentle stretching', note: '10-15 min, nothing intense' },
    { name: 'Meditation or breathing', note: '10-20 min of box breathing or a body scan' },
    { name: 'Leisure walk', note: '15-20 min at an easy pace, outdoors if you can' },
    { name: 'Meal prep', note: 'High-protein meals for the week ahead' },
  ],
}

export function getProgram(id: string): Program | undefined {
  return programMap.get(id)
}
