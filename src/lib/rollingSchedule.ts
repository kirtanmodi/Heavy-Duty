import type { ProgramDay, WorkoutEntry } from "../types";
import { getSessionTitle } from "../data/programs";
import { addDaysToDateKey, daysBetweenDateKeys, getIsoDateKey, getTodayDateKey, parseDateKey } from "./dates";

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

/** Rest and recovery slots exist to enforce a recovery gap. Cardio is a session, so it is never skipped. */
function isRestSlot(day: ProgramDay | undefined): boolean {
  return day?.type === "rest" || day?.type === "recovery";
}

/** Date of the last logged session of any kind (lift, cardio, recovery or rest) before `dateKey`. */
function getLastActivityDateKey(history: WorkoutEntry[], dateKey: string): string | null {
  for (const workout of history) {
    const workoutDateKey = getIsoDateKey(workout.date);
    if (workoutDateKey < dateKey) return workoutDateKey;
  }
  return null;
}

/** True when a full day with nothing logged sits between the last session and `dateKey`. */
function hasRestedSinceLastSession(history: WorkoutEntry[], dateKey: string): boolean {
  const last = getLastActivityDateKey(history, dateKey);
  return last !== null && daysBetweenDateKeys(dateKey, last) >= 2;
}

/**
 * Skip rest slots when the user already took a day off (nothing logged for a
 * full day). Stops at the next lift or cardio day. Only used for the first
 * open day: later projected days assume the plan is followed.
 */
function skipRedundantRestDays(cycle: ProgramDay[], cycleIndex: number, dateKey: string, history: WorkoutEntry[]): number {
  if (!isRestSlot(cycle[cycleIndex]) || !hasRestedSinceLastSession(history, dateKey)) return cycleIndex;
  let idx = cycleIndex;
  for (let i = 0; i < cycle.length; i++) {
    if (!isRestSlot(cycle[idx])) return idx;
    idx = (idx + 1) % cycle.length;
  }
  return cycleIndex;
}

function getCycleDistance(cycleLength: number, fromIndex: number, toIndex: number): number {
  return toIndex >= fromIndex ? toIndex - fromIndex : cycleLength - fromIndex + toIndex;
}

function getMostStaleLiftDayIndex(
  cycle: ProgramDay[],
  cycleIndex: number,
  dateKey: string,
  history: WorkoutEntry[],
): number | null {
  const lastDoneByLiftDay = new Map<string, string>();
  const liftDayIds = new Set(cycle.filter((day) => day.type === "lift").map((day) => day.id));

  for (const workout of history) {
    if ((workout.dayType ?? "lift") !== "lift") continue;
    if (!liftDayIds.has(workout.dayId)) continue;

    const workoutDateKey = getIsoDateKey(workout.date);
    if (workoutDateKey > dateKey) continue;

    const existing = lastDoneByLiftDay.get(workout.dayId);
    if (!existing || workoutDateKey > existing) {
      lastDoneByLiftDay.set(workout.dayId, workoutDateKey);
    }
  }

  const candidates = cycle
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => day.type === "lift")
    .map(({ day, index }) => ({
      index,
      lastDoneDateKey: lastDoneByLiftDay.get(day.id) ?? null,
      distance: getCycleDistance(cycle.length, cycleIndex, index),
    }))
    .sort((a, b) => {
      if (a.lastDoneDateKey === null && b.lastDoneDateKey !== null) return -1;
      if (a.lastDoneDateKey !== null && b.lastDoneDateKey === null) return 1;
      if (a.lastDoneDateKey !== b.lastDoneDateKey) {
        return (a.lastDoneDateKey ?? "").localeCompare(b.lastDoneDateKey ?? "");
      }
      return a.distance - b.distance;
    });

  return candidates[0]?.index ?? null;
}

function resolveStartingCycleIndex(
  cycle: ProgramDay[],
  cycleIndex: number,
  startDateKey: string,
  history: WorkoutEntry[],
): number {
  // Lift and cardio days are always kept. A rest slot is dropped only after a real day off.
  if (!isRestSlot(cycle[cycleIndex]) || !hasRestedSinceLastSession(history, startDateKey)) return cycleIndex;

  // Back after a break: start with the lift you have gone longest without.
  return getMostStaleLiftDayIndex(cycle, cycleIndex, startDateKey, history)
    ?? skipRedundantRestDays(cycle, cycleIndex, startDateKey, history);
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
  const fallbackFocus = getSessionTitle(workout.day);

  return {
    id: workout.dayId,
    name: workout.day,
    type: workout.dayType ?? "lift",
    dayOfWeek: date.getDay(),
    focus: fallbackFocus,
    exercises: [],
    description: workout.activityName
      ? `You logged ${workout.activityName}.`
      : workout.dayType === "rest"
        ? "You logged this as a rest day."
        : workout.dayType === "cardio"
          ? "You logged this as a cardio day."
          : workout.dayType === "recovery"
            ? "You logged this as a recovery day."
            : "You logged a session on this day.",
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

  // After a long gap, pick the stalest lift instead of rewinding to a recently-done one.
  cycleIndex = resolveStartingCycleIndex(cycle, cycleIndex, startDateKey, history);

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
