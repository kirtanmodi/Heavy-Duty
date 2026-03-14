import type { WorkoutEntry } from "../types";
import { exerciseGroups, exerciseMap } from "../data/exercises";
import { cardioActivities } from "../data/programs";
import type { CardioActivity } from "../data/programs";

export interface MuscleRecoveryStatus {
  group: string;
  daysSinceLastTrained: number | null;
  status: "recovering" | "recovered" | "never";
  lastExercises: string[];
}

export const muscleToGroup = new Map<string, string>();
for (const g of exerciseGroups) {
  for (const m of g.muscles) {
    muscleToGroup.set(m, g.label);
  }
}

/**
 * Counts how many consecutive past sessions (that targeted a muscle group)
 * had ALL exercises for that group skipped.
 * Returns a map of group label → consecutive skip count.
 */
export function getGroupSkipHistory(
  history: WorkoutEntry[],
): Map<string, number> {
  const result = new Map<string, number>();
  const liftEntries = history.filter((w) => (w.dayType ?? "lift") === "lift");

  for (const g of exerciseGroups) {
    let consecutiveSkips = 0;

    for (const workout of liftEntries) {
      // Find exercises in this workout that target this group
      const groupExercises = workout.exercises.filter((ex) => {
        const def = exerciseMap.get(ex.id);
        if (!def) return false;
        return def.primaryMuscles.some((m) => muscleToGroup.get(m) === g.label);
      });

      // Skip workouts that didn't target this group at all
      if (groupExercises.length === 0) continue;

      // Check if ALL exercises for this group were skipped
      const allSkipped = groupExercises.every((ex) => ex.skipped);
      if (allSkipped) {
        consecutiveSkips++;
      } else {
        break; // Found a session where the group was actually trained
      }
    }

    result.set(g.label, consecutiveSkips);
  }

  return result;
}

export function getMuscleRecoveryStatus(
  history: WorkoutEntry[],
): MuscleRecoveryStatus[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Track most recent date and exercises per group
  const groupLastDate = new Map<string, Date>();
  const groupExercises = new Map<string, string[]>();

  // Scan last 30 lift entries for performance
  const liftEntries = history
    .filter((w) => (w.dayType ?? "lift") === "lift")
    .slice(0, 30);

  for (const workout of liftEntries) {
    const workoutDate = new Date(workout.date);
    for (const ex of workout.exercises) {
      if (ex.skipped) continue;
      const def = exerciseMap.get(ex.id);
      if (!def) continue;
      for (const muscle of def.primaryMuscles) {
        const group = muscleToGroup.get(muscle);
        if (!group) continue;
        const existing = groupLastDate.get(group);
        if (!existing || workoutDate > existing) {
          groupLastDate.set(group, workoutDate);
          groupExercises.set(group, []);
        }
        if (
          workoutDate.toDateString() === groupLastDate.get(group)!.toDateString()
        ) {
          const exList = groupExercises.get(group)!;
          if (!exList.includes(ex.name)) exList.push(ex.name);
        }
      }
    }
  }

  return exerciseGroups.map((g) => {
    const lastDate = groupLastDate.get(g.label);
    if (!lastDate) {
      return {
        group: g.label,
        daysSinceLastTrained: null,
        status: "never" as const,
        lastExercises: [],
      };
    }
    const lastDateStart = new Date(
      lastDate.getFullYear(),
      lastDate.getMonth(),
      lastDate.getDate(),
    );
    const daysSince = Math.floor(
      (todayStart.getTime() - lastDateStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      group: g.label,
      daysSinceLastTrained: daysSince,
      status: daysSince < 4 ? ("recovering" as const) : ("recovered" as const),
      lastExercises: groupExercises.get(g.label) ?? [],
    };
  });
}

export interface RestDaySuggestion {
  type: "active-recovery" | "light-cardio" | "full-rest";
  message: string;
  activities: CardioActivity[];
}

export function getDaysSinceLastActivity(history: WorkoutEntry[]): number {
  if (history.length === 0) return 999;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDate = new Date(history[0].date);
  const lastDateStart = new Date(
    lastDate.getFullYear(),
    lastDate.getMonth(),
    lastDate.getDate(),
  );
  return Math.floor(
    (todayStart.getTime() - lastDateStart.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function getRestDaySuggestion(
  daysSinceLastActivity: number,
): RestDaySuggestion {
  // Saturday recovery activities = gentle movement
  const recoveryActivities = cardioActivities["hd-saturday"] ?? [];
  // Tuesday zone 2 = light cardio
  const lightCardioActivities = cardioActivities["hd-tuesday"] ?? [];

  if (daysSinceLastActivity === 0) {
    return {
      type: "full-rest",
      message: "You trained today. Full rest is fine — recovery is when muscles grow.",
      activities: pickRandom(recoveryActivities, 2),
    };
  }

  if (daysSinceLastActivity === 1) {
    return {
      type: "active-recovery",
      message: "Light movement will boost recovery and keep your momentum going.",
      activities: pickRandom(recoveryActivities, 3),
    };
  }

  // 2+ days
  return {
    type: "light-cardio",
    message: "Time to move! Even 15-20 min of light cardio keeps you on track.",
    activities: pickRandom(lightCardioActivities, 3),
  };
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
