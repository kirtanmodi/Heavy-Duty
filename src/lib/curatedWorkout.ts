import type { GymEquipmentId, GymEquipmentProfile, LiftFocus } from '../types'

type EquipmentCategory = 'Machines' | 'Free Weights' | 'Cardio'

interface GymEquipmentOption {
  id: GymEquipmentId
  label: string
  category: EquipmentCategory
  focuses: LiftFocus[]
}

interface CuratedCandidate {
  exerciseId: string
  isAvailable: (profile: GymEquipmentProfile) => boolean
}

interface CuratedSlot {
  label: string
  candidates: CuratedCandidate[]
}

export interface CurateResult {
  exerciseIds: string[]
  skippedSlots: string[]
}

const has = (profile: GymEquipmentProfile, equipmentId: GymEquipmentId) => profile[equipmentId]
const hasAny = (profile: GymEquipmentProfile, equipmentIds: GymEquipmentId[]) => equipmentIds.some((equipmentId) => has(profile, equipmentId))
const hasAnyBench = (profile: GymEquipmentProfile) => hasAny(profile, ['flat-bench', 'incline-bench', 'decline-bench'])

export const gymEquipmentOptions: GymEquipmentOption[] = [
  { id: 'chest-press-machine', label: 'Chest Press', category: 'Machines', focuses: ['Push'] },
  { id: 'fly-machine', label: 'Fly / Pec Deck', category: 'Machines', focuses: ['Push'] },
  { id: 'shoulder-press-machine', label: 'Shoulder Press', category: 'Machines', focuses: ['Push'] },
  { id: 'lateral-raise', label: 'Lateral Raise', category: 'Machines', focuses: ['Push'] },
  { id: 'tricep-press-machine', label: 'Tricep Press', category: 'Machines', focuses: ['Push'] },
  { id: 'lat-pulldown', label: 'Lat Pulldown', category: 'Machines', focuses: ['Pull'] },
  { id: 'high-row-machine', label: 'High Row', category: 'Machines', focuses: ['Pull'] },
  { id: 'row-machine', label: 'Row', category: 'Machines', focuses: ['Pull'] },
  { id: 'rear-deltoid-machine', label: 'Rear Deltoid', category: 'Machines', focuses: ['Pull'] },
  { id: 'bicep-curl', label: 'Bicep Curl', category: 'Machines', focuses: ['Pull'] },
  { id: 'front-bicep-curl', label: 'Front Bicep Curl', category: 'Machines', focuses: ['Pull'] },
  { id: 'dual-adjustable-pulley', label: 'Dual Adjustable Pulley', category: 'Machines', focuses: ['Push', 'Pull', 'Legs & Abs'] },
  { id: 'assisted-dip-chin-up', label: 'Assisted Dip / Chin-Up', category: 'Machines', focuses: ['Push', 'Pull'] },
  { id: 'pull-up-bar', label: 'Pull-Up Bar', category: 'Machines', focuses: ['Pull', 'Legs & Abs'] },
  { id: 'linear-leg-press', label: 'Linear Leg Press', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'seated-leg-press', label: 'Seated Leg Press', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'leg-extension-machine', label: 'Leg Extension', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'leg-curl-machine', label: 'Leg Curl', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'calf-raise-machine', label: 'Calf Raise', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'abdominal-crunch-machine', label: 'Abdominal Crunch', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'back-extension', label: 'Back Extension', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'hip-adductor', label: 'Hip Adductor', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'hip-abductor', label: 'Hip Abductor', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'barbells', label: 'Barbells', category: 'Free Weights', focuses: ['Push', 'Pull', 'Legs & Abs'] },
  { id: 'dumbbells', label: 'Dumbbells', category: 'Free Weights', focuses: ['Push', 'Pull', 'Legs & Abs'] },
  { id: 'squat-rack', label: 'Squat Rack', category: 'Free Weights', focuses: ['Legs & Abs'] },
  { id: 'flat-bench', label: 'Flat Bench', category: 'Free Weights', focuses: ['Push', 'Pull'] },
  { id: 'incline-bench', label: 'Incline Bench', category: 'Free Weights', focuses: ['Push', 'Pull'] },
  { id: 'decline-bench', label: 'Decline Bench', category: 'Free Weights', focuses: ['Push'] },
  { id: 'leg-raise-stand', label: 'Leg Raise Stand', category: 'Free Weights', focuses: ['Legs & Abs'] },
  { id: 'stairs', label: 'Stairs / StairMaster', category: 'Cardio', focuses: [] },
  { id: 'cycle', label: 'Stationary Cycle', category: 'Cardio', focuses: [] },
  { id: 'elliptical', label: 'Elliptical', category: 'Cardio', focuses: [] },
  { id: 'treadmill', label: 'Treadmill', category: 'Cardio', focuses: [] },
]

export const defaultGymEquipmentProfile = gymEquipmentOptions.reduce((profile, option) => {
  profile[option.id] = true
  return profile
}, {} as GymEquipmentProfile)

// Workout templates per lift focus
const workoutTemplates: Record<LiftFocus, CuratedSlot[]> = {
  Push: [
    {
      label: 'Chest Fly',
      candidates: [
        { exerciseId: 'pec-deck-fly', isAvailable: (profile) => has(profile, 'fly-machine') },
        { exerciseId: 'dumbbell-flyes', isAvailable: (profile) => has(profile, 'dumbbells') && hasAnyBench(profile) },
      ],
    },
    {
      label: 'Chest Press',
      candidates: [
        { exerciseId: 'machine-chest-press', isAvailable: (profile) => has(profile, 'chest-press-machine') },
        { exerciseId: 'incline-bench-press', isAvailable: (profile) => has(profile, 'barbells') && has(profile, 'incline-bench') },
        { exerciseId: 'barbell-bench-press', isAvailable: (profile) => has(profile, 'barbells') && has(profile, 'flat-bench') },
      ],
    },
    {
      label: 'Shoulder Press',
      candidates: [
        { exerciseId: 'machine-shoulder-press', isAvailable: (profile) => has(profile, 'shoulder-press-machine') },
        { exerciseId: 'overhead-press', isAvailable: (profile) => has(profile, 'barbells') },
      ],
    },
    {
      label: 'Lateral Raise',
      candidates: [
        { exerciseId: 'machine-lateral-raise', isAvailable: (profile) => has(profile, 'lateral-raise') },
        { exerciseId: 'side-lateral-raise', isAvailable: (profile) => has(profile, 'dumbbells') },
      ],
    },
    {
      label: 'Tricep Isolation',
      candidates: [
        { exerciseId: 'tricep-pushdown', isAvailable: (profile) => hasAny(profile, ['tricep-press-machine', 'dual-adjustable-pulley']) },
        { exerciseId: 'skull-crushers', isAvailable: (profile) => has(profile, 'barbells') && hasAnyBench(profile) },
      ],
    },
    {
      label: 'Tricep Compound',
      candidates: [
        { exerciseId: 'weighted-dips', isAvailable: (profile) => hasAny(profile, ['assisted-dip-chin-up', 'pull-up-bar']) },
      ],
    },
  ],
  Pull: [
    {
      label: 'Lat Isolation',
      candidates: [
        { exerciseId: 'dumbbell-pullover', isAvailable: (profile) => has(profile, 'dumbbells') && hasAnyBench(profile) },
        { exerciseId: 'cable-pullover', isAvailable: (profile) => has(profile, 'dual-adjustable-pulley') },
      ],
    },
    {
      label: 'Lat Compound',
      candidates: [
        { exerciseId: 'lat-pulldown', isAvailable: (profile) => has(profile, 'lat-pulldown') },
        { exerciseId: 'assisted-chin-up', isAvailable: (profile) => has(profile, 'assisted-dip-chin-up') },
      ],
    },
    {
      label: 'Row',
      candidates: [
        { exerciseId: 'machine-high-row', isAvailable: (profile) => has(profile, 'high-row-machine') },
        { exerciseId: 'seated-cable-row', isAvailable: (profile) => hasAny(profile, ['row-machine', 'dual-adjustable-pulley']) },
        { exerciseId: 'barbell-row', isAvailable: (profile) => has(profile, 'barbells') },
      ],
    },
    {
      label: 'Rear Delt',
      candidates: [
        { exerciseId: 'rear-delt-machine', isAvailable: (profile) => has(profile, 'rear-deltoid-machine') },
        { exerciseId: 'rear-delt-fly', isAvailable: (profile) => has(profile, 'dumbbells') },
      ],
    },
    {
      label: 'Shrugs',
      candidates: [
        { exerciseId: 'barbell-shrugs', isAvailable: (profile) => has(profile, 'barbells') },
        { exerciseId: 'dumbbell-shrugs', isAvailable: (profile) => has(profile, 'dumbbells') },
      ],
    },
    {
      label: 'Bicep Curl',
      candidates: [
        { exerciseId: 'machine-bicep-curl', isAvailable: (profile) => hasAny(profile, ['bicep-curl', 'front-bicep-curl']) },
        { exerciseId: 'barbell-curl', isAvailable: (profile) => has(profile, 'barbells') },
        { exerciseId: 'hammer-curl', isAvailable: (profile) => has(profile, 'dumbbells') },
      ],
    },
  ],
  'Legs & Abs': [
    {
      label: 'Quad Isolation',
      candidates: [
        { exerciseId: 'leg-extension', isAvailable: (profile) => has(profile, 'leg-extension-machine') },
      ],
    },
    {
      label: 'Quad Compound',
      candidates: [
        { exerciseId: 'leg-press', isAvailable: (profile) => hasAny(profile, ['linear-leg-press', 'seated-leg-press']) },
        { exerciseId: 'barbell-squat', isAvailable: (profile) => has(profile, 'squat-rack') && has(profile, 'barbells') },
      ],
    },
    {
      label: 'Leg Curl',
      candidates: [
        { exerciseId: 'leg-curl', isAvailable: (profile) => has(profile, 'leg-curl-machine') },
        { exerciseId: 'dumbbell-leg-curl', isAvailable: (profile) => has(profile, 'dumbbells') && hasAnyBench(profile) },
      ],
    },
    {
      label: 'Calf Raise',
      candidates: [
        { exerciseId: 'calf-raise', isAvailable: (profile) => has(profile, 'calf-raise-machine') },
        { exerciseId: 'standing-calf-raise', isAvailable: (profile) => has(profile, 'calf-raise-machine') },
      ],
    },
    {
      label: 'Ab Crunch',
      candidates: [
        { exerciseId: 'abdominal-crunch-machine', isAvailable: (profile) => has(profile, 'abdominal-crunch-machine') },
        { exerciseId: 'cable-crunch', isAvailable: (profile) => has(profile, 'dual-adjustable-pulley') },
      ],
    },
  ],
}

export function getGymEquipmentOptionsForFocus(focus: LiftFocus): GymEquipmentOption[] {
  return gymEquipmentOptions.filter((option) => option.focuses.includes(focus))
}

interface CurateOptions {
  shuffle?: boolean
  avoid?: string[]
}

function pickCandidate(
  slot: CuratedSlot,
  profile: GymEquipmentProfile,
  selected: string[],
  shuffle: boolean,
  avoid: string[],
): string | null {
  const available = slot.candidates.filter((c) => c.isAvailable(profile) && !selected.includes(c.exerciseId))
  if (available.length === 0) return null
  if (!shuffle) return available[0].exerciseId

  // Prefer candidates not in the avoid list
  const preferred = available.filter((c) => !avoid.includes(c.exerciseId))
  const pool = preferred.length > 0 ? preferred : available
  return pool[Math.floor(Math.random() * pool.length)].exerciseId
}

export function curateWorkoutForFocus(focus: LiftFocus, profile: GymEquipmentProfile, options: CurateOptions = {}): CurateResult {
  const exerciseIds: string[] = []
  const skippedSlots: string[] = []
  const shuffle = options.shuffle ?? false
  const avoid = options.avoid ?? []

  for (const slot of workoutTemplates[focus]) {
    const picked = pickCandidate(slot, profile, exerciseIds, shuffle, avoid)
    if (picked) {
      exerciseIds.push(picked)
    } else {
      skippedSlots.push(slot.label)
    }
  }

  return { exerciseIds, skippedSlots }
}
