import type {
  CustomGymEquipment,
  Equipment,
  Exercise,
  ExerciseEntry,
  GymEquipmentProfile,
  ProgramId,
  WorkoutEntry,
} from "../types";

export interface BackupWorkoutState {
  history: WorkoutEntry[];
  activeWorkout: {
    dayId: string;
    dayName: string;
    program: string;
    exercises: ExerciseEntry[];
    startedAt: string;
  } | null;
  lastCompletedWorkout: WorkoutEntry | null;
}

export interface BackupExerciseState {
  customExercises: Exercise[];
  nameOverrides: Record<string, string>;
  removedIds: string[];
  weightMode: Record<string, "bodyweight" | "weighted">;
  equipmentOverride: Record<string, Equipment>;
}

export interface BackupSettingsState {
  activeProgram: ProgramId;
  restTimerSeconds: number;
  autoStartTimer: boolean;
  gymEquipment: GymEquipmentProfile;
  customGymEquipment: CustomGymEquipment[];
}

export interface BackupData {
  version: 2;
  exportedAt: string;
  workout: BackupWorkoutState;
  exercises: BackupExerciseState;
  settings: BackupSettingsState;
}

type LegacyExportData = {
  version: 1;
  exportedAt?: string;
  workouts: WorkoutEntry[];
  exercises?: {
    custom?: Exercise[];
    nameOverrides?: Record<string, string>;
    removedIds?: string[];
    weightMode?: Record<string, "bodyweight" | "weighted">;
  };
  settings?: {
    restTimerSeconds?: number;
    autoStartTimer?: boolean;
  };
};

export interface ValidatedBackup {
  backup: BackupData;
  sourceVersion: 1 | 2;
}

export function exportJSON(
  workout: BackupWorkoutState,
  exercises: BackupExerciseState,
  settings: BackupSettingsState,
): void {
  const data: BackupData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    workout,
    exercises,
    settings,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `heavy-duty-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(workouts: WorkoutEntry[]): void {
  const rows: string[] = ["Date,Day,Type,Exercise,Set,Weight (kg),Reps,To Failure,Skipped"];

  for (const w of workouts) {
    const dayType = w.dayType ?? "lift";
    if (w.exercises.length === 0) {
      // Cardio/recovery sessions with no exercises
      rows.push(csvRow([w.date, w.day, dayType, "", "", "", "", "", ""]));
      continue;
    }
    for (const ex of w.exercises) {
      if (ex.skipped) {
        rows.push(csvRow([w.date, w.day, dayType, ex.name, "", "", "", "", "Yes"]));
        continue;
      }
      for (let i = 0; i < ex.sets.length; i++) {
        const s = ex.sets[i];
        rows.push(csvRow([w.date, w.day, dayType, ex.name, String(i + 1), String(s.weight), String(s.reps), s.toFailure ? "Yes" : "No", "No"]));
      }
    }
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `heavy-duty-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvRow(fields: string[]): string {
  return fields.map((f) => (f.includes(",") || f.includes('"') ? `"${f.replace(/"/g, '""')}"` : f)).join(",");
}

export function validateImport(json: unknown): ValidatedBackup | null {
  if (!isRecord(json)) return null;
  if (json.version === 2) return validateV2Backup(json);
  if (json.version === 1) return validateLegacyBackup(json as LegacyExportData);
  return null;
}

function validateV2Backup(json: Record<string, unknown>): ValidatedBackup | null {
  if (!isRecord(json.workout) || !Array.isArray(json.workout.history)) return null;
  if (!isRecord(json.exercises) || !isRecord(json.settings)) return null;

  const exercises = json.exercises;
  const settings = json.settings;

  if (!Array.isArray(exercises.customExercises)) return null;
  if (!Array.isArray(settings.customGymEquipment)) return null;

  return {
    sourceVersion: 2,
    backup: {
      version: 2,
      exportedAt: typeof json.exportedAt === "string" ? json.exportedAt : new Date().toISOString(),
      workout: {
        history: json.workout.history as WorkoutEntry[],
        activeWorkout: (json.workout.activeWorkout ?? null) as BackupWorkoutState["activeWorkout"],
        lastCompletedWorkout: (json.workout.lastCompletedWorkout ?? null) as WorkoutEntry | null,
      },
      exercises: {
        customExercises: exercises.customExercises as Exercise[],
        nameOverrides: asStringRecord(exercises.nameOverrides),
        removedIds: asStringArray(exercises.removedIds),
        weightMode: asWeightModeRecord(exercises.weightMode),
        equipmentOverride: asEquipmentRecord(exercises.equipmentOverride),
      },
      settings: {
        activeProgram: (settings.activeProgram as ProgramId | undefined) ?? "heavy-duty-complete",
        restTimerSeconds: asNumber(settings.restTimerSeconds, 120),
        autoStartTimer: asBoolean(settings.autoStartTimer, true),
        gymEquipment: asBooleanRecord(settings.gymEquipment),
        customGymEquipment: settings.customGymEquipment as CustomGymEquipment[],
      },
    },
  };
}

function validateLegacyBackup(json: LegacyExportData): ValidatedBackup | null {
  if (!Array.isArray(json.workouts)) return null;

  return {
    sourceVersion: 1,
    backup: {
      version: 2,
      exportedAt: typeof json.exportedAt === "string" ? json.exportedAt : new Date().toISOString(),
      workout: {
        history: json.workouts,
        activeWorkout: null,
        lastCompletedWorkout: null,
      },
      exercises: {
        customExercises: json.exercises?.custom ?? [],
        nameOverrides: json.exercises?.nameOverrides ?? {},
        removedIds: json.exercises?.removedIds ?? [],
        weightMode: json.exercises?.weightMode ?? {},
        equipmentOverride: {},
      },
      settings: {
        activeProgram: "heavy-duty-complete",
        restTimerSeconds: json.settings?.restTimerSeconds ?? 120,
        autoStartTimer: json.settings?.autoStartTimer ?? true,
        gymEquipment: {},
        customGymEquipment: [],
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asWeightModeRecord(
  value: unknown,
): Record<string, "bodyweight" | "weighted"> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, "bodyweight" | "weighted"] =>
        entry[1] === "bodyweight" || entry[1] === "weighted",
    ),
  );
}

function asEquipmentRecord(value: unknown): Record<string, Equipment> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, Equipment] =>
        entry[1] === "barbell" ||
        entry[1] === "dumbbells" ||
        entry[1] === "cable" ||
        entry[1] === "machine" ||
        entry[1] === "bodyweight+",
    ),
  );
}

function asBooleanRecord(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
