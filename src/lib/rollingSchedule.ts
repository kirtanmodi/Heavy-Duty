import type { ProgramDay, WorkoutEntry } from "../types";
import { addDaysToDateKey, getIsoDateKey, getTodayDateKey, parseDateKey } from "./dates";

export interface RollingProgramDay {
  day: ProgramDay;
  cycleIndex: number;
  dateKey: string;
  dateOffset: number;
}

export type RollingSlotSource = "planned" | "logged-program" | "logged-manual";

export interface RollingScheduleSlot extends RollingProgramDay {
  source: RollingSlotSource;
  workout?: WorkoutEntry;
}

function getProgramDayIndex(programDays: ProgramDay[], dayId: string): number {
  return programDays.findIndex((day) => day.id === dayId);
}

/** Any non-lift manual log satisfies any non-lift cycle day (cardio/recovery/rest are interchangeable for cycle advancement). */
function isNonLiftTypeMatch(cycle: ProgramDay[], cycleIndex: number, workout: WorkoutEntry): boolean {
  const expected = cycle[cycleIndex];
  if (!expected || expected.type === "lift") return false;
  const loggedType = workout.dayType ?? "lift";
  return loggedType !== "lift";
}

export function getProgramCycle(programDays: ProgramDay[]): ProgramDay[] {
  return [...programDays];
}

function getPrimaryWorkoutOnDate(history: WorkoutEntry[], dateKey: string): WorkoutEntry | null {
  const sameDateEntries = history.filter((workout) => getIsoDateKey(workout.date) === dateKey);
  if (sameDateEntries.length === 0) return null;
  return sameDateEntries.find((workout) => (workout.dayType ?? "lift") === "lift") ?? sameDateEntries[0];
}

function createManualProgramDay(workout: WorkoutEntry, dateKey: string): ProgramDay {
  const date = parseDateKey(dateKey);
  const fallbackFocus =
    workout.day.includes("—") ? workout.day.split("—").pop()?.trim() ?? workout.day : workout.day;

  return {
    id: workout.dayId,
    name: workout.day,
    type: workout.dayType ?? "lift",
    dayOfWeek: date.getDay(),
    focus: fallbackFocus,
    exercises: [],
    description: workout.activityName
      ? `Logged activity: ${workout.activityName}`
      : workout.dayType === "rest"
        ? "Logged as a rest day."
        : workout.dayType === "cardio"
          ? "Logged as a cardio day."
          : workout.dayType === "recovery"
            ? "Logged as a recovery day."
            : "Logged session.",
  };
}

export function getLastCompletedCycleDayBeforeDate(
  programDays: ProgramDay[],
  history: WorkoutEntry[],
  startDateKey: string,
): { day: ProgramDay; index: number; dateKey: string } | null {
  const cycle = getProgramCycle(programDays);
  for (const workout of history) {
    const dateKey = getIsoDateKey(workout.date);
    if (dateKey >= startDateKey) continue;
    const index = getProgramDayIndex(cycle, workout.dayId);
    if (index !== -1) {
      return { day: cycle[index], index, dateKey };
    }
  }
  return null;
}

export function getNextCycleIndex(programDays: ProgramDay[], history: WorkoutEntry[]): number {
  return getNextCycleIndexFromDate(programDays, history, getTodayDateKey());
}

function getNextCycleIndexFromDate(
  programDays: ProgramDay[],
  history: WorkoutEntry[],
  startDateKey: string,
): number {
  if (programDays.length === 0) return 0;
  const cycle = getProgramCycle(programDays);
  const anchor = getLastCompletedCycleDayBeforeDate(programDays, history, startDateKey);
  if (!anchor) return 0;

  let cycleIndex = (anchor.index + 1) % cycle.length;

  // Forward-scan entries between anchor and startDateKey to advance past manual non-lift logs
  const entriesBetween = history
    .filter((w) => {
      const dk = getIsoDateKey(w.date);
      return dk > anchor.dateKey && dk < startDateKey;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const workout of entriesBetween) {
    const loggedIndex = getProgramDayIndex(cycle, workout.dayId);
    if (loggedIndex !== -1) {
      cycleIndex = (loggedIndex + 1) % cycle.length;
    } else if (isNonLiftTypeMatch(cycle, cycleIndex, workout)) {
      cycleIndex = (cycleIndex + 1) % cycle.length;
    }
  }

  return cycleIndex;
}

export function getRollingDayAtOffset(
  programDays: ProgramDay[],
  history: WorkoutEntry[],
  offset: number,
  startDateKey = getTodayDateKey(),
): ProgramDay | null {
  if (programDays.length === 0) return null;
  const cycle = getProgramCycle(programDays);
  let cycleIndex = getNextCycleIndexFromDate(cycle, history, startDateKey);
  let openDaysSeen = 0;

  for (let dateOffset = 0; dateOffset < 365; dateOffset++) {
    const dateKey = addDaysToDateKey(startDateKey, dateOffset);
    const workout = getPrimaryWorkoutOnDate(history, dateKey);

    if (workout) {
      const loggedIndex = getProgramDayIndex(cycle, workout.dayId);
      if (loggedIndex !== -1) {
        cycleIndex = (loggedIndex + 1) % cycle.length;
      } else if (isNonLiftTypeMatch(cycle, cycleIndex, workout)) {
        cycleIndex = (cycleIndex + 1) % cycle.length;
      }
      continue;
    }

    const day = cycle[cycleIndex] ?? null;
    if (!day) return null;
    if (openDaysSeen === offset) return day;

    openDaysSeen++;
    cycleIndex = (cycleIndex + 1) % cycle.length;
  }

  return null;
}

export function getUpcomingOpenRollingDays(
  programDays: ProgramDay[],
  history: WorkoutEntry[],
  count: number,
  startDateKey = getTodayDateKey(),
): RollingProgramDay[] {
  if (programDays.length === 0 || count <= 0) return [];
  const cycle = getProgramCycle(programDays);
  const result: RollingProgramDay[] = [];
  let cycleIndex = getNextCycleIndexFromDate(cycle, history, startDateKey);

  for (let dateOffset = 0; result.length < count && dateOffset < 365; dateOffset++) {
    const dateKey = addDaysToDateKey(startDateKey, dateOffset);
    const workout = getPrimaryWorkoutOnDate(history, dateKey);

    if (workout) {
      const loggedIndex = getProgramDayIndex(cycle, workout.dayId);
      if (loggedIndex !== -1) {
        cycleIndex = (loggedIndex + 1) % cycle.length;
      } else if (isNonLiftTypeMatch(cycle, cycleIndex, workout)) {
        cycleIndex = (cycleIndex + 1) % cycle.length;
      }
      continue;
    }

    result.push({
      day: cycle[cycleIndex],
      cycleIndex,
      dateKey,
      dateOffset,
    });
    cycleIndex = (cycleIndex + 1) % cycle.length;
  }

  return result;
}

export function getUpcomingRollingDays(
  programDays: ProgramDay[],
  history: WorkoutEntry[],
  count: number,
  startDateKey = getTodayDateKey(),
): RollingScheduleSlot[] {
  if (programDays.length === 0 || count <= 0) return [];

  const cycle = getProgramCycle(programDays);
  let cycleIndex = getNextCycleIndexFromDate(cycle, history, startDateKey);
  const result: RollingScheduleSlot[] = [];
  let plannedDaysEmitted = 0;

  for (let dateOffset = 0; plannedDaysEmitted < count && dateOffset < 365; dateOffset++) {
    const dateKey = addDaysToDateKey(startDateKey, dateOffset);
    const workout = getPrimaryWorkoutOnDate(history, dateKey);

    if (workout) {
      const loggedIndex = getProgramDayIndex(cycle, workout.dayId);
      if (loggedIndex !== -1) {
        result.push({
          day: cycle[loggedIndex],
          cycleIndex: loggedIndex,
          dateOffset,
          dateKey,
          source: "logged-program",
          workout,
        });
        cycleIndex = (loggedIndex + 1) % cycle.length;
      } else if (isNonLiftTypeMatch(cycle, cycleIndex, workout)) {
        result.push({
          day: cycle[cycleIndex],
          cycleIndex,
          dateOffset,
          dateKey,
          source: "logged-program",
          workout,
        });
        cycleIndex = (cycleIndex + 1) % cycle.length;
      } else {
        result.push({
          day: createManualProgramDay(workout, dateKey),
          cycleIndex,
          dateOffset,
          dateKey,
          source: "logged-manual",
          workout,
        });
      }
      continue;
    }

    result.push({
      day: cycle[cycleIndex],
      cycleIndex,
      dateOffset,
      dateKey,
      source: "planned",
    });
    plannedDaysEmitted++;
    cycleIndex = (cycleIndex + 1) % cycle.length;
  }

  return result;
}
