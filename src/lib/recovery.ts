import type { WorkoutEntry, ProgramDay, DayType } from "../types";
import { exerciseGroups, exerciseMap, getEffectiveExercise } from "../data/exercises";
import { cardioActivities } from "../data/programs";
import type { CardioActivity } from "../data/programs";
import { daysBetweenDateKeys, daysSinceIsoDate, getIsoDateKey, getTodayDateKey } from "./dates";

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

/** Maps a ProgramDay's exercise IDs to unique muscle group labels. */
export function getLiftDayGroups(day: ProgramDay): string[] {
  const groups = new Set<string>();
  for (const exId of day.exercises) {
    const def = getEffectiveExercise(exId) ?? exerciseMap.get(exId);
    if (!def) continue;
    for (const muscle of def.primaryMuscles) {
      const group = muscleToGroup.get(muscle);
      if (group) groups.add(group);
    }
  }
  return [...groups];
}

export interface SmartSuggestion {
  type: DayType;
  reason?: string;
  suggestion?: string;
}

export function getSmartProgramDaySuggestion(
  programDay: ProgramDay | undefined,
  programDays: ProgramDay[],
  recoveryStatuses: MuscleRecoveryStatus[],
  enableAdaptation = true,
): SmartSuggestion {
  if (!programDay) return { type: "rest" };
  if (!enableAdaptation || programDay.type !== "lift") return { type: programDay.type };

  const targetGroups = getLiftDayGroups(programDay);
  const recoveringGroups = targetGroups.filter((g) => {
    const status = recoveryStatuses.find((s) => s.group === g);
    return status?.status === "recovering";
  });

  if (recoveringGroups.length === 0) return { type: "lift" };

  // Find an alternative lift day whose groups are ALL recovered
  const alternative = programDays.find((d) => {
    if (d.id === programDay.id || d.type !== "lift") return false;
    const altGroups = getLiftDayGroups(d);
    return altGroups.every((g) => {
      const status = recoveryStatuses.find((s) => s.group === g);
      return !status || status.status !== "recovering";
    });
  });

  const reason = `${recoveringGroups.join(", ")} still recovering`;

  if (alternative) {
    return {
      type: "lift",
      reason,
      suggestion: `Swap to ${alternative.focus}`,
    };
  }

  return { type: "cardio", reason, suggestion: "Swap to cardio" };
}

export function getSmartDaySuggestion(
  dow: number,
  dateOffset: number,
  programDays: ProgramDay[],
  recoveryStatuses: MuscleRecoveryStatus[],
): SmartSuggestion {
  const programDay = programDays.find((d) => d.dayOfWeek === dow);
  return getSmartProgramDaySuggestion(programDay, programDays, recoveryStatuses, dateOffset <= 2);
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
  const todayDateKey = getTodayDateKey();
  const liftEntries = history.filter(
    (w) => (w.dayType ?? "lift") === "lift" && getIsoDateKey(w.date) <= todayDateKey,
  );

  for (const g of exerciseGroups) {
    let consecutiveSkips = 0;

    for (const workout of liftEntries) {
      // Find exercises in this workout that target this group
      const groupExercises = workout.exercises.filter((ex) => {
        const def = getEffectiveExercise(ex.id) ?? exerciseMap.get(ex.id);
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
  const todayDateKey = getTodayDateKey();

  // Track most recent date and exercises per group
  const groupLastDateKey = new Map<string, string>();
  const groupExercises = new Map<string, string[]>();

  // Scan last 30 lift entries for performance
  const liftEntries = history
    .filter((w) => (w.dayType ?? "lift") === "lift" && getIsoDateKey(w.date) <= todayDateKey)
    .slice(0, 30);

  for (const workout of liftEntries) {
    const workoutDateKey = getIsoDateKey(workout.date);
    for (const ex of workout.exercises) {
      if (ex.skipped) continue;
      const def = getEffectiveExercise(ex.id) ?? exerciseMap.get(ex.id);
      if (!def) continue;
      for (const muscle of def.primaryMuscles) {
        const group = muscleToGroup.get(muscle);
        if (!group) continue;
        const existingDateKey = groupLastDateKey.get(group);
        if (!existingDateKey || workoutDateKey > existingDateKey) {
          groupLastDateKey.set(group, workoutDateKey);
          groupExercises.set(group, []);
        }
        if (workoutDateKey === groupLastDateKey.get(group)) {
          const exList = groupExercises.get(group)!;
          if (!exList.includes(ex.name)) exList.push(ex.name);
        }
      }
    }
  }

  return exerciseGroups.map((g) => {
    const lastDateKey = groupLastDateKey.get(g.label);
    if (!lastDateKey) {
      return {
        group: g.label,
        daysSinceLastTrained: null,
        status: "never" as const,
        lastExercises: [],
      };
    }
    const daysSince = daysBetweenDateKeys(todayDateKey, lastDateKey);
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
  const todayDateKey = getTodayDateKey();
  const lastPastOrToday = history.find((workout) => getIsoDateKey(workout.date) <= todayDateKey);
  if (!lastPastOrToday) return 999;
  return daysSinceIsoDate(lastPastOrToday.date);
}

export function getRestDaySuggestion(
  daysSinceLastActivity: number,
): RestDaySuggestion {
  // Recovery activities = gentle movement
  const recoveryActivities = cardioActivities["hd-saturday"] ?? [];
  // Light cardio options
  const lightCardioActivities = cardioActivities["hd-cardio"] ?? [];

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
