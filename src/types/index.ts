export type MuscleGroup =
  | "chest"
  | "upper-chest"
  | "lats"
  | "mid-back"
  | "lower-back"
  | "front-delts"
  | "side-delts"
  | "rear-delts"
  | "traps"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export type Equipment = "barbell" | "dumbbells" | "cable" | "machine" | "bodyweight+";

export type ExerciseType = "compound" | "isolation";

export interface Exercise {
  id: string;
  name: string;
  equipment: Equipment;
  type: ExerciseType;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  mentzerTips: string;
  repRange: [number, number];
  restSeconds: number;
  weightIncrement: number;
}

export interface SetEntry {
  weight: number;
  reps: number;
  toFailure: boolean;
  tempo: string;
}

export interface ExerciseEntry {
  id: string;
  name: string;
  sets: SetEntry[];
  skipped?: boolean;
}

export interface WorkoutEntry {
  id: string;
  date: string;
  program: string;
  day: string;
  dayId: string;
  dayType?: DayType;
  activityName?: string;
  startedAt?: string;
  exercises: ExerciseEntry[];
}

export type DayType = "lift" | "cardio" | "recovery" | "rest";

export interface ProgramDay {
  id: string;
  name: string;
  type: DayType;
  dayOfWeek: number;
  focus: string;
  exercises: string[];
  description?: string;
  duration?: string;
  tips?: string;
}

export interface Program {
  id: string;
  name: string;
  shortName: string;
  description: string;
  days: ProgramDay[];
  recommended?: boolean;
}

export type ProgramId = "heavy-duty-complete";

export type LiftFocus = "Push" | "Pull" | "Legs & Abs";

export type GymEquipmentId =
  | "lat-pulldown"
  | "lateral-raise"
  | "front-bicep-curl"
  | "bicep-curl"
  | "calf-raise-machine"
  | "linear-leg-press"
  | "shoulder-press-machine"
  | "chest-press-machine"
  | "fly-machine"
  | "rear-deltoid-machine"
  | "dual-adjustable-pulley"
  | "high-row-machine"
  | "row-machine"
  | "tricep-press-machine"
  | "abdominal-crunch-machine"
  | "leg-curl-machine"
  | "leg-extension-machine"
  | "hip-adductor"
  | "hip-abductor"
  | "seated-leg-press"
  | "back-extension"
  | "pull-up-bar"
  | "assisted-dip-chin-up"
  | "squat-rack"
  | "barbells"
  | "dumbbells"
  | "flat-bench"
  | "incline-bench"
  | "decline-bench"
  | "leg-raise-stand"
  | "stairs"
  | "cycle"
  | "elliptical"
  | "treadmill";

export type GymEquipmentProfile = Record<string, boolean>;

export interface CustomGymEquipment {
  id: string;
  label: string;
  category: string;
}

export interface OverloadSuggestion {
  message: string;
  suggestedWeight: number | null;
  suggestedReps: number;
  type: "testing" | "increase" | "maintain" | "decrease";
}
