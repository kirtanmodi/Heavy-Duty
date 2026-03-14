import type { WorkoutEntry } from "../types";

interface ExportData {
  version: 1;
  exportedAt: string;
  workouts: WorkoutEntry[];
  exercises: {
    custom: unknown[];
    nameOverrides: Record<string, string>;
    removedIds: string[];
    weightMode: Record<string, string>;
  };
  settings: {
    restTimerSeconds: number;
    autoStartTimer: boolean;
  };
}

export function exportJSON(
  workouts: WorkoutEntry[],
  exerciseState: {
    customExercises: unknown[];
    nameOverrides: Record<string, string>;
    removedIds: string[];
    weightMode: Record<string, string>;
  },
  settings: { restTimerSeconds: number; autoStartTimer: boolean },
): void {
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    workouts,
    exercises: {
      custom: exerciseState.customExercises,
      nameOverrides: exerciseState.nameOverrides,
      removedIds: exerciseState.removedIds,
      weightMode: exerciseState.weightMode,
    },
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

export function validateImport(json: unknown): ExportData | null {
  if (!json || typeof json !== "object") return null;
  const data = json as Record<string, unknown>;
  if (data.version !== 1) return null;
  if (!Array.isArray(data.workouts)) return null;
  return json as ExportData;
}

export function mergeImport(
  existing: WorkoutEntry[],
  imported: ExportData,
): {
  workouts: WorkoutEntry[];
  exercises: ExportData["exercises"];
  settings: ExportData["settings"];
  newCount: number;
} {
  const existingIds = new Set(existing.map((w) => w.id));
  const newWorkouts = imported.workouts.filter((w) => !existingIds.has(w.id));
  const merged = [...newWorkouts, ...existing].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return {
    workouts: merged,
    exercises: imported.exercises,
    settings: imported.settings,
    newCount: newWorkouts.length,
  };
}
