export type MuscleGroup =
  | 'chest'
  | 'upper-chest'
  | 'lats'
  | 'mid-back'
  | 'lower-back'
  | 'front-delts'
  | 'side-delts'
  | 'rear-delts'
  | 'traps'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'

export type Equipment = 'barbell' | 'dumbbells' | 'cable' | 'machine' | 'bodyweight+'

export type ExerciseType = 'compound' | 'isolation'

export interface Exercise {
  id: string
  name: string
  equipment: Equipment
  type: ExerciseType
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  mentzerTips: string
  repRange: [number, number]
  restSeconds: number
  weightIncrement: number
  supersetWith: string | null
}

export interface SetEntry {
  weight: number
  reps: number
  toFailure: boolean
  tempo: string
}

export interface ExerciseEntry {
  id: string
  name: string
  sets: SetEntry[]
  skipped?: boolean
}

export interface WorkoutEntry {
  id: string
  date: string
  program: string
  day: string
  dayId: string
  startedAt?: string
  exercises: ExerciseEntry[]
}

export type DayType = 'lift' | 'cardio' | 'recovery' | 'rest'

export interface ProgramDay {
  id: string
  name: string
  type: DayType
  dayOfWeek: number
  focus: string
  exercises: string[]
  supersets: [string, string][]
  description?: string
  duration?: string
  tips?: string
}

export interface Program {
  id: string
  name: string
  shortName: string
  description: string
  days: ProgramDay[]
  recommended?: boolean
}

export type ProgramId = 'heavy-duty-complete'

export interface OverloadSuggestion {
  message: string
  suggestedWeight: number | null
  suggestedReps: number
  type: 'testing' | 'increase' | 'maintain' | 'decrease'
}
