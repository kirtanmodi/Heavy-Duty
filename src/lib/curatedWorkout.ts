import type { GymEquipmentId, GymEquipmentProfile, LiftFocus } from '../types'

type EquipmentCategory = 'Machines' | 'Free Weights'

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
  candidates: CuratedCandidate[]
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
  { id: 'torso-rotation', label: 'Torso Rotation', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'back-extension', label: 'Back Extension', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'hip-adductor', label: 'Hip Adductor', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'hip-abductor', label: 'Hip Abductor', category: 'Machines', focuses: ['Legs & Abs'] },
  { id: 'barbells', label: 'Barbells', category: 'Free Weights', focuses: ['Push', 'Pull', 'Legs & Abs'] },
  { id: 'dumbbells', label: 'Dumbbells', category: 'Free Weights', focuses: ['Push', 'Pull', 'Legs & Abs'] },
  { id: 'squat-rack', label: 'Squat Rack', category: 'Free Weights', focuses: ['Legs & Abs'] },
  { id: 'flat-bench', label: 'Flat Bench', category: 'Free Weights', focuses: ['Push', 'Pull'] },
  { id: 'incline-bench', label: 'Incline Bench', category: 'Free Weights', focuses: ['Push', 'Pull'] },
  { id: 'decline-bench', label: 'Decline Bench', category: 'Free Weights', focuses: ['Push'] },
  { id: 'floor-mats', label: 'Floor Mats', category: 'Free Weights', focuses: ['Legs & Abs'] },
  { id: 'leg-raise-stand', label: 'Leg Raise Stand', category: 'Free Weights', focuses: ['Legs & Abs'] },
]

export const defaultGymEquipmentProfile = gymEquipmentOptions.reduce((profile, option) => {
  profile[option.id] = true
  return profile
}, {} as GymEquipmentProfile)

const workoutTemplates: Record<LiftFocus, CuratedSlot[]> = {
  Push: [
    {
      candidates: [
        { exerciseId: 'pec-deck-fly', isAvailable: (profile) => has(profile, 'fly-machine') },
        { exerciseId: 'dumbbell-flyes', isAvailable: (profile) => has(profile, 'dumbbells') && hasAnyBench(profile) },
      ],
    },
    {
      candidates: [
        { exerciseId: 'machine-chest-press', isAvailable: (profile) => has(profile, 'chest-press-machine') },
        { exerciseId: 'incline-bench-press', isAvailable: (profile) => has(profile, 'barbells') && has(profile, 'incline-bench') },
        { exerciseId: 'barbell-bench-press', isAvailable: (profile) => has(profile, 'barbells') && has(profile, 'flat-bench') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'machine-shoulder-press', isAvailable: (profile) => has(profile, 'shoulder-press-machine') },
        { exerciseId: 'overhead-press', isAvailable: (profile) => has(profile, 'barbells') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'machine-lateral-raise', isAvailable: (profile) => has(profile, 'lateral-raise') },
        { exerciseId: 'side-lateral-raise', isAvailable: (profile) => has(profile, 'dumbbells') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'tricep-pushdown', isAvailable: (profile) => hasAny(profile, ['tricep-press-machine', 'dual-adjustable-pulley']) },
      ],
    },
  ],
  Pull: [
    {
      candidates: [
        { exerciseId: 'dumbbell-pullover', isAvailable: (profile) => has(profile, 'dumbbells') && hasAnyBench(profile) },
      ],
    },
    {
      candidates: [
        { exerciseId: 'lat-pulldown', isAvailable: (profile) => has(profile, 'lat-pulldown') },
        { exerciseId: 'assisted-chin-up', isAvailable: (profile) => has(profile, 'assisted-dip-chin-up') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'machine-high-row', isAvailable: (profile) => has(profile, 'high-row-machine') },
        { exerciseId: 'seated-cable-row', isAvailable: (profile) => hasAny(profile, ['row-machine', 'dual-adjustable-pulley']) },
        { exerciseId: 'barbell-row', isAvailable: (profile) => has(profile, 'barbells') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'rear-delt-machine', isAvailable: (profile) => has(profile, 'rear-deltoid-machine') },
        { exerciseId: 'rear-delt-fly', isAvailable: (profile) => has(profile, 'dumbbells') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'barbell-shrugs', isAvailable: (profile) => has(profile, 'barbells') },
        { exerciseId: 'dumbbell-shrugs', isAvailable: (profile) => has(profile, 'dumbbells') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'machine-bicep-curl', isAvailable: (profile) => hasAny(profile, ['bicep-curl', 'front-bicep-curl']) },
        { exerciseId: 'barbell-curl', isAvailable: (profile) => has(profile, 'barbells') },
        { exerciseId: 'hammer-curl', isAvailable: (profile) => has(profile, 'dumbbells') },
      ],
    },
  ],
  'Legs & Abs': [
    {
      candidates: [
        { exerciseId: 'leg-extension', isAvailable: (profile) => has(profile, 'leg-extension-machine') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'leg-press', isAvailable: (profile) => hasAny(profile, ['linear-leg-press', 'seated-leg-press']) },
        { exerciseId: 'barbell-squat', isAvailable: (profile) => has(profile, 'squat-rack') && has(profile, 'barbells') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'romanian-deadlift', isAvailable: (profile) => has(profile, 'barbells') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'leg-curl', isAvailable: (profile) => has(profile, 'leg-curl-machine') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'calf-raise', isAvailable: (profile) => has(profile, 'calf-raise-machine') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'abdominal-crunch-machine', isAvailable: (profile) => has(profile, 'abdominal-crunch-machine') },
        { exerciseId: 'cable-crunch', isAvailable: (profile) => has(profile, 'dual-adjustable-pulley') },
      ],
    },
    {
      candidates: [
        { exerciseId: 'hanging-leg-raise', isAvailable: (profile) => hasAny(profile, ['leg-raise-stand', 'pull-up-bar']) },
      ],
    },
  ],
}

export function getGymEquipmentOptionsForFocus(focus: LiftFocus): GymEquipmentOption[] {
  return gymEquipmentOptions.filter((option) => option.focuses.includes(focus))
}

export function curateWorkoutForFocus(focus: LiftFocus, profile: GymEquipmentProfile): string[] {
  const selected: string[] = []

  for (const slot of workoutTemplates[focus]) {
    const match = slot.candidates.find((candidate) => candidate.isAvailable(profile) && !selected.includes(candidate.exerciseId))
    if (match) selected.push(match.exerciseId)
  }

  return selected
}