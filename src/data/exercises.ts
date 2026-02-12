import type { Exercise, MuscleGroup } from '../types'
import { useExerciseStore } from '../store/exerciseStore'

export const exercises: Exercise[] = [
  // === CHEST ===
  {
    id: 'dumbbell-flyes',
    name: 'Dumbbell Flyes',
    equipment: 'dumbbells',
    type: 'isolation',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['front-delts'],
    mentzerTips: 'Pre-exhaust movement. 4s stretch on the way down, 1s pause at full stretch, 4s squeeze up. Focus on the chest doing the work — arms are just hooks. Stop when you cannot complete a full rep with control.',
    repRange: [6, 8],
    restSeconds: 0,
    weightIncrement: 2,
    supersetWith: 'incline-bench-press',
  },
  {
    id: 'incline-bench-press',
    name: 'Incline Bench Press',
    equipment: 'barbell',
    type: 'compound',
    primaryMuscles: ['chest', 'upper-chest'],
    secondaryMuscles: ['front-delts', 'triceps'],
    mentzerTips: 'Immediately after flyes — chest is pre-exhausted. 4s lower to chest, 1s pause (no bounce), 4s press up. Do NOT lock out — keep tension on the chest. Go to absolute failure.',
    repRange: [6, 8],
    restSeconds: 120,
    weightIncrement: 2.5,
    supersetWith: 'dumbbell-flyes',
  },
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    equipment: 'barbell',
    type: 'compound',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['front-delts', 'triceps'],
    mentzerTips: '4s controlled descent to mid-chest, 1s pause, 4s explosive press. Full range of motion. No bouncing off the chest. Train to failure on every working set.',
    repRange: [6, 8],
    restSeconds: 120,
    weightIncrement: 2.5,
    supersetWith: null,
  },
  {
    id: 'pec-deck-fly',
    name: 'Pec Deck Fly',
    equipment: 'machine',
    type: 'isolation',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['front-delts'],
    mentzerTips: '4s controlled opening, 1s full stretch, 4s squeeze together. Focus on squeezing the chest at peak contraction. Machine provides constant tension — use it.',
    repRange: [8, 10],
    restSeconds: 60,
    weightIncrement: 2,
    supersetWith: null,
  },
  {
    id: 'weighted-dips',
    name: 'Weighted Dips',
    equipment: 'bodyweight+',
    type: 'compound',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['front-delts'],
    mentzerTips: 'Lean forward for chest emphasis. 4s lower until upper arms parallel, 1s pause, 4s push up. Add weight via belt when bodyweight becomes easy. Go to failure.',
    repRange: [6, 8],
    restSeconds: 120,
    weightIncrement: 2.5,
    supersetWith: null,
  },

  // === BACK ===
  {
    id: 'dumbbell-pullover',
    name: 'Dumbbell Pullover',
    equipment: 'dumbbells',
    type: 'isolation',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['chest', 'triceps'],
    mentzerTips: 'Pre-exhaust for lats. 4s stretch overhead (feel the lats lengthen), 1s pause, 4s pull back over chest. Keep slight bend in elbows. This is a lat exercise — think about pulling with your back.',
    repRange: [6, 8],
    restSeconds: 0,
    weightIncrement: 2,
    supersetWith: 'lat-pulldown',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    equipment: 'cable',
    type: 'compound',
    primaryMuscles: ['lats', 'mid-back'],
    secondaryMuscles: ['biceps', 'rear-delts'],
    mentzerTips: 'Immediately after pullovers. 4s controlled release up, 1s full stretch at top, 4s pull to upper chest. Lean back slightly. Pull with elbows, not hands. To absolute failure.',
    repRange: [6, 8],
    restSeconds: 120,
    weightIncrement: 2.5,
    supersetWith: 'dumbbell-pullover',
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    equipment: 'barbell',
    type: 'compound',
    primaryMuscles: ['mid-back', 'lats'],
    secondaryMuscles: ['biceps', 'rear-delts', 'lower-back'],
    mentzerTips: '4s lower the bar, 1s pause at full stretch, 4s row to lower chest. Keep back at 45 degrees. Squeeze shoulder blades at the top. No momentum — strict form to failure.',
    repRange: [6, 8],
    restSeconds: 90,
    weightIncrement: 2.5,
    supersetWith: null,
  },
  {
    id: 'seated-cable-row',
    name: 'Seated Cable Row',
    equipment: 'cable',
    type: 'compound',
    primaryMuscles: ['mid-back', 'lats'],
    secondaryMuscles: ['biceps', 'rear-delts'],
    mentzerTips: '4s release forward with full stretch, 1s pause, 4s pull to abdomen. Keep torso upright. Squeeze shoulder blades together at contraction. Constant tension.',
    repRange: [8, 10],
    restSeconds: 90,
    weightIncrement: 2.5,
    supersetWith: null,
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    equipment: 'barbell',
    type: 'compound',
    primaryMuscles: ['lower-back', 'glutes', 'hamstrings'],
    secondaryMuscles: ['quads', 'traps', 'forearms'],
    mentzerTips: '4s controlled descent, 1s pause at floor (no bouncing), 4s lift. Hinge at hips, keep back flat. This is a full-body compound — respect the weight. One all-out set can be enough.',
    repRange: [6, 8],
    restSeconds: 120,
    weightIncrement: 5,
    supersetWith: null,
  },

  // === SHOULDERS ===
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    equipment: 'barbell',
    type: 'compound',
    primaryMuscles: ['front-delts', 'side-delts'],
    secondaryMuscles: ['triceps', 'upper-chest', 'traps'],
    mentzerTips: '4s lower to chin level, 1s pause, 4s press overhead. Do NOT lock out — keep tension on delts. No leg drive. Strict form, train to failure.',
    repRange: [6, 8],
    restSeconds: 90,
    weightIncrement: 2.5,
    supersetWith: null,
  },
  {
    id: 'side-lateral-raise',
    name: 'Side Lateral Raise',
    equipment: 'dumbbells',
    type: 'isolation',
    primaryMuscles: ['side-delts'],
    secondaryMuscles: ['front-delts', 'traps'],
    mentzerTips: '4s lower to sides, 1s pause, 4s raise to shoulder height. Slight bend in elbows. Lead with elbows, not hands. Control the negative — no swinging. Lighter weight, perfect form.',
    repRange: [8, 10],
    restSeconds: 60,
    weightIncrement: 1,
    supersetWith: null,
  },
  {
    id: 'rear-delt-fly',
    name: 'Rear Delt Fly',
    equipment: 'dumbbells',
    type: 'isolation',
    primaryMuscles: ['rear-delts'],
    secondaryMuscles: ['mid-back', 'traps'],
    mentzerTips: 'Bent over at 90 degrees. 4s lower, 1s pause, 4s raise out to sides. Squeeze shoulder blades at top. Light weight, strict form. Feel the rear delts burn.',
    repRange: [8, 10],
    restSeconds: 60,
    weightIncrement: 1,
    supersetWith: null,
  },

  // === ARMS ===
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    equipment: 'barbell',
    type: 'isolation',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    mentzerTips: '4s lower to full extension, 1s pause at bottom (no resting), 4s curl up. No swinging — if you need momentum, the weight is too heavy. Squeeze at the top.',
    repRange: [6, 8],
    restSeconds: 90,
    weightIncrement: 2.5,
    supersetWith: null,
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    equipment: 'cable',
    type: 'isolation',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    mentzerTips: 'Pre-exhaust for triceps. 4s release up, 1s pause, 4s push down to full lockout. Keep elbows pinned to sides. Only forearms move. Squeeze at the bottom.',
    repRange: [6, 8],
    restSeconds: 0,
    weightIncrement: 2,
    supersetWith: 'weighted-dips',
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    equipment: 'dumbbells',
    type: 'isolation',
    primaryMuscles: ['biceps', 'forearms'],
    secondaryMuscles: [],
    mentzerTips: 'Neutral grip (palms facing each other). 4s lower, 1s pause, 4s curl. Targets brachialis and forearms. No swinging. Strict form to failure.',
    repRange: [8, 10],
    restSeconds: 60,
    weightIncrement: 2,
    supersetWith: null,
  },
  {
    id: 'skull-crushers',
    name: 'Skull Crushers',
    equipment: 'barbell',
    type: 'isolation',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    mentzerTips: '4s lower to forehead, 1s pause, 4s extend. Keep upper arms vertical — only forearms move. Full range of motion. If elbows hurt, switch to pushdowns.',
    repRange: [6, 8],
    restSeconds: 90,
    weightIncrement: 2,
    supersetWith: null,
  },

  // === TRAPS ===
  {
    id: 'barbell-shrugs',
    name: 'Barbell Shrugs',
    equipment: 'barbell',
    type: 'isolation',
    primaryMuscles: ['traps'],
    secondaryMuscles: [],
    mentzerTips: '4s lower (let traps stretch fully), 1s pause, 4s shrug straight up. Do NOT roll shoulders — straight up and down only. Hold at top and squeeze. Heavy weight, strict form.',
    repRange: [8, 10],
    restSeconds: 60,
    weightIncrement: 2.5,
    supersetWith: null,
  },
  {
    id: 'dumbbell-shrugs',
    name: 'Dumbbell Shrugs',
    equipment: 'dumbbells',
    type: 'isolation',
    primaryMuscles: ['traps'],
    secondaryMuscles: [],
    mentzerTips: '4s lower, 1s full stretch at bottom, 4s shrug up. Dumbbells allow more natural arm position. No rolling — straight up and down. Squeeze at the top.',
    repRange: [8, 10],
    restSeconds: 60,
    weightIncrement: 2,
    supersetWith: null,
  },

  // === LEGS ===
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    equipment: 'machine',
    type: 'isolation',
    primaryMuscles: ['quads'],
    secondaryMuscles: [],
    mentzerTips: 'Pre-exhaust for quads. 4s lower, 1s pause at bottom, 4s extend to full lockout. Squeeze quads hard at the top. This is the burn that makes the leg press brutal.',
    repRange: [8, 10],
    restSeconds: 0,
    weightIncrement: 2,
    supersetWith: 'leg-press',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    equipment: 'machine',
    type: 'compound',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    mentzerTips: 'Immediately after leg extensions. 4s lower until knees at 90 degrees, 1s pause (no bouncing), 4s press. Feet shoulder-width, mid-platform. Do NOT lock knees at top. To absolute failure.',
    repRange: [8, 10],
    restSeconds: 120,
    weightIncrement: 5,
    supersetWith: 'leg-extension',
  },
  {
    id: 'barbell-squat',
    name: 'Barbell Squat',
    equipment: 'barbell',
    type: 'compound',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'lower-back', 'core'],
    mentzerTips: '4s controlled descent to parallel or below, 1s pause at bottom, 4s drive up. Keep chest up, knees tracking over toes. Full range of motion. One working set to failure can be sufficient.',
    repRange: [6, 8],
    restSeconds: 120,
    weightIncrement: 5,
    supersetWith: null,
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    equipment: 'barbell',
    type: 'compound',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['lower-back'],
    mentzerTips: '4s hinge down (feel the hamstring stretch), 1s pause at max stretch, 4s drive hips forward. Keep bar close to legs. Slight bend in knees. Back stays flat throughout.',
    repRange: [6, 8],
    restSeconds: 120,
    weightIncrement: 2.5,
    supersetWith: null,
  },
  {
    id: 'leg-curl',
    name: 'Leg Curl',
    equipment: 'machine',
    type: 'isolation',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
    mentzerTips: '4s release (resist the weight), 1s pause at full extension, 4s curl up. Squeeze hamstrings hard at peak contraction. Do not use momentum.',
    repRange: [8, 10],
    restSeconds: 60,
    weightIncrement: 2,
    supersetWith: null,
  },
  {
    id: 'standing-calf-raise',
    name: 'Standing Calf Raise',
    equipment: 'machine',
    type: 'isolation',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    mentzerTips: '4s lower into deep stretch (heels below platform), 1s pause at full stretch, 4s raise to maximum contraction. Full range is critical for calves. Squeeze hard at top.',
    repRange: [10, 12],
    restSeconds: 60,
    weightIncrement: 2.5,
    supersetWith: null,
  },
  {
    id: 'calf-raise',
    name: 'Calf Raise',
    equipment: 'machine',
    type: 'isolation',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    mentzerTips: '4s lower into deep stretch, 1s pause, 4s raise to full contraction. Calves respond to high reps and deep stretches. Full range of motion every rep.',
    repRange: [10, 12],
    restSeconds: 60,
    weightIncrement: 2.5,
    supersetWith: null,
  },

  // === ABS ===
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    equipment: 'bodyweight+',
    type: 'isolation',
    primaryMuscles: ['core'],
    secondaryMuscles: ['forearms'],
    mentzerTips: '4s lower legs, 1s pause at bottom, 4s raise legs to parallel or higher. No swinging — if you swing, you are cheating your abs. Add weight between feet when bodyweight is easy.',
    repRange: [10, 12],
    restSeconds: 60,
    weightIncrement: 1,
    supersetWith: null,
  },
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    equipment: 'cable',
    type: 'isolation',
    primaryMuscles: ['core'],
    secondaryMuscles: [],
    mentzerTips: '4s release up, 1s pause, 4s crunch down. Think about bringing ribs to hips. Do not pull with arms — abs do the work. Full range of motion.',
    repRange: [10, 12],
    restSeconds: 60,
    weightIncrement: 2,
    supersetWith: null,
  },
]

export const exerciseMap = new Map(exercises.map(e => [e.id, e]))

export function getExercise(id: string): Exercise | undefined {
  return exerciseMap.get(id)
}

export function getExercisesByMuscle(muscle: string): Exercise[] {
  const targetMuscle = muscle as MuscleGroup
  return exercises.filter(
    e => e.primaryMuscles.includes(targetMuscle) || e.secondaryMuscles.includes(targetMuscle)
  )
}

export const muscleGroupLabels: Record<string, string> = {
  chest: 'Chest',
  'upper-chest': 'Upper Chest',
  lats: 'Lats',
  'mid-back': 'Mid Back',
  'lower-back': 'Lower Back',
  'front-delts': 'Front Delts',
  'side-delts': 'Side Delts',
  'rear-delts': 'Rear Delts',
  traps: 'Traps',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
}

export const muscleColors: Record<string, string> = {
  chest: '#FF4444',
  'upper-chest': '#FF4444',
  lats: '#4488FF',
  'mid-back': '#4488FF',
  'lower-back': '#4488FF',
  'front-delts': '#FFAA00',
  'side-delts': '#FFAA00',
  'rear-delts': '#FFAA00',
  traps: '#88CCFF',
  biceps: '#44DD44',
  triceps: '#DD44DD',
  forearms: '#66BB66',
  quads: '#FF8844',
  hamstrings: '#FFCC44',
  glutes: '#FF6644',
  calves: '#DDAA44',
  core: '#CCCC44',
}

export const exerciseGroups = [
  { label: 'Chest', muscles: ['chest', 'upper-chest'] },
  { label: 'Back', muscles: ['lats', 'mid-back', 'lower-back'] },
  { label: 'Shoulders', muscles: ['front-delts', 'side-delts', 'rear-delts'] },
  { label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { label: 'Traps', muscles: ['traps'] },
  { label: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { label: 'Abs', muscles: ['core'] },
] as const

export function getExercisesByGroup(groupLabel: string): Exercise[] {
  const group = exerciseGroups.find(g => g.label === groupLabel)
  if (!group) return []
  return exercises.filter(e =>
    e.primaryMuscles.some(m => (group.muscles as readonly string[]).includes(m))
  )
}

function applyOverrides(base: Exercise): Exercise | null {
  const { nameOverrides, removedIds } = useExerciseStore.getState()
  if (removedIds.includes(base.id)) return null
  if (nameOverrides[base.id]) return { ...base, name: nameOverrides[base.id] }
  return base
}

export function getEffectiveExercise(id: string): Exercise | undefined {
  const { customExercises, removedIds } = useExerciseStore.getState()
  if (removedIds.includes(id)) return undefined
  const custom = customExercises.find(e => e.id === id)
  if (custom) return custom
  const base = exerciseMap.get(id)
  if (!base) return undefined
  return applyOverrides(base) ?? undefined
}

export function getEffectiveExercises(): Exercise[] {
  const { customExercises } = useExerciseStore.getState()
  const base = exercises
    .map(applyOverrides)
    .filter((e): e is Exercise => e !== null)
  return [...base, ...customExercises]
}

export function getEffectiveExercisesByGroup(groupLabel: string): Exercise[] {
  const group = exerciseGroups.find(g => g.label === groupLabel)
  if (!group) return []
  return getEffectiveExercises().filter(e =>
    e.primaryMuscles.some(m => (group.muscles as readonly string[]).includes(m))
  )
}
