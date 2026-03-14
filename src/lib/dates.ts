// Shared date formatting utilities

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKeyToUtcTime(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function getIsoDateKey(iso: string): string {
  return formatDateKey(new Date(iso));
}

export function createSessionIso(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0).toISOString();
}

export function getTodayDateKey(now = new Date()): string {
  return formatDateKey(now);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

export function daysBetweenDateKeys(laterDateKey: string, earlierDateKey: string): number {
  return Math.round((dateKeyToUtcTime(laterDateKey) - dateKeyToUtcTime(earlierDateKey)) / 86400000);
}

export function daysSinceIsoDate(iso: string, todayDateKey = getTodayDateKey()): number {
  return daysBetweenDateKeys(todayDateKey, getIsoDateKey(iso));
}

/** "Today", "Yesterday", "3 days ago", then "Wed, Mar 14" */
export function formatRelativeDate(iso: string): string {
  const days = daysSinceIsoDate(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "Today", "Yesterday", "3d ago", then "Mar 14" */
export function formatRelativeDateShort(iso: string): string {
  const days = daysSinceIsoDate(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Mon · Mar 14" */
export function formatDayDate(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${day} · ${dateStr}`;
}

/** "March 2026" */
export function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Days since the most recent session matching dayId, or null if never done */
export function daysSinceLastSession(dayId: string, history: { dayId: string; date: string }[]): number | null {
  for (const w of history) {
    if (w.dayId === dayId) {
      return daysSinceIsoDate(w.date);
    }
  }
  return null;
}
