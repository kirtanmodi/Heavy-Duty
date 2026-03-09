import type { WorkoutEntry } from "../types";

// Epley formula: estimated 1RM = weight × (1 + reps / 30)
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export interface ExerciseSession {
  date: string;
  bestWeight: number;
  bestReps: number;
  estimated1RM: number;
  totalVolume: number;
  totalSets: number;
}

export function getExerciseSessions(
  exerciseId: string,
  history: WorkoutEntry[],
  limit = 20,
): ExerciseSession[] {
  const sessions: ExerciseSession[] = [];

  for (const w of history) {
    const ex = w.exercises.find((e) => e.id === exerciseId && !e.skipped);
    if (!ex || ex.sets.length === 0) continue;

    const completedSets = ex.sets.filter((s) => s.reps > 0);
    if (completedSets.length === 0) continue;

    let bestWeight = 0;
    let bestReps = 0;
    let best1RM = 0;
    let totalVolume = 0;

    for (const s of completedSets) {
      const e1rm = estimate1RM(s.weight, s.reps);
      if (e1rm > best1RM) {
        best1RM = e1rm;
        bestWeight = s.weight;
        bestReps = s.reps;
      }
      totalVolume += s.weight * s.reps;
    }

    sessions.push({
      date: w.date,
      bestWeight,
      bestReps,
      estimated1RM: best1RM,
      totalVolume,
      totalSets: completedSets.length,
    });
  }

  return sessions.slice(0, limit).reverse(); // chronological order
}

export interface PRRecord {
  type: "weight" | "1rm" | "volume";
  value: number;
  reps?: number;
  date: string;
}

export function getExercisePRs(
  exerciseId: string,
  history: WorkoutEntry[],
): PRRecord[] {
  let bestWeight: PRRecord | null = null;
  let best1RM: PRRecord | null = null;
  let bestVolume: PRRecord | null = null;

  for (const w of history) {
    const ex = w.exercises.find((e) => e.id === exerciseId && !e.skipped);
    if (!ex) continue;

    let sessionVolume = 0;
    for (const s of ex.sets) {
      if (s.reps <= 0) continue;
      sessionVolume += s.weight * s.reps;

      if (!bestWeight || s.weight > bestWeight.value) {
        bestWeight = { type: "weight", value: s.weight, reps: s.reps, date: w.date };
      }

      const e1rm = estimate1RM(s.weight, s.reps);
      if (!best1RM || e1rm > best1RM.value) {
        best1RM = { type: "1rm", value: e1rm, date: w.date };
      }
    }

    if (sessionVolume > 0 && (!bestVolume || sessionVolume > bestVolume.value)) {
      bestVolume = { type: "volume", value: sessionVolume, date: w.date };
    }
  }

  return [bestWeight, best1RM, bestVolume].filter((p): p is PRRecord => p !== null);
}

// Get all unique exercises from history
export function getTrackedExercises(
  history: WorkoutEntry[],
): { id: string; name: string; sessionCount: number }[] {
  const map = new Map<string, { name: string; count: number }>();

  for (const w of history) {
    for (const ex of w.exercises) {
      if (ex.skipped) continue;
      if (!ex.sets.some((s) => s.reps > 0)) continue;
      const existing = map.get(ex.id);
      if (existing) {
        existing.count++;
      } else {
        map.set(ex.id, { name: ex.name, count: 1 });
      }
    }
  }

  return Array.from(map.entries())
    .map(([id, { name, count }]) => ({ id, name, sessionCount: count }))
    .sort((a, b) => b.sessionCount - a.sessionCount);
}
