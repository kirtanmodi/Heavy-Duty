import type { ProgramDay, WorkoutEntry } from "../types";
import { addDaysToDateKey, getTodayDateKey } from "./dates";

export interface RollingProgramDay {
  day: ProgramDay;
  cycleIndex: number;
  dateKey: string;
  dateOffset: number;
}

function getProgramDayIndex(programDays: ProgramDay[], dayId: string): number {
  return programDays.findIndex((day) => day.id === dayId);
}

export function getProgramCycle(programDays: ProgramDay[]): ProgramDay[] {
  return [...programDays];
}

export function getLastCompletedCycleDay(
  programDays: ProgramDay[],
  history: WorkoutEntry[],
): { day: ProgramDay; index: number } | null {
  const cycle = getProgramCycle(programDays);
  for (const workout of history) {
    const index = getProgramDayIndex(cycle, workout.dayId);
    if (index !== -1) {
      return { day: cycle[index], index };
    }
  }
  return null;
}

export function getNextCycleIndex(programDays: ProgramDay[], history: WorkoutEntry[]): number {
  if (programDays.length === 0) return 0;
  const lastCompleted = getLastCompletedCycleDay(programDays, history);
  return lastCompleted ? (lastCompleted.index + 1) % programDays.length : 0;
}

export function getRollingDayAtOffset(
  programDays: ProgramDay[],
  history: WorkoutEntry[],
  offset: number,
): ProgramDay | null {
  if (programDays.length === 0) return null;
  const cycle = getProgramCycle(programDays);
  const anchorIndex = getNextCycleIndex(cycle, history);
  return cycle[(anchorIndex + offset) % cycle.length] ?? null;
}

export function getUpcomingRollingDays(
  programDays: ProgramDay[],
  history: WorkoutEntry[],
  count: number,
  startDateKey = getTodayDateKey(),
): RollingProgramDay[] {
  if (programDays.length === 0 || count <= 0) return [];

  const cycle = getProgramCycle(programDays);
  const anchorIndex = getNextCycleIndex(cycle, history);

  return Array.from({ length: count }, (_, dateOffset) => {
    const cycleIndex = (anchorIndex + dateOffset) % cycle.length;
    return {
      day: cycle[cycleIndex],
      cycleIndex,
      dateOffset,
      dateKey: addDaysToDateKey(startDateKey, dateOffset),
    };
  });
}
