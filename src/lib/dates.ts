// Shared date formatting utilities

function diffDays(iso: string): number {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);
}

/** "Today", "Yesterday", "3 days ago", then "Wed, Mar 14" */
export function formatRelativeDate(iso: string): string {
  const days = diffDays(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "Today", "Yesterday", "3d ago", then "Mar 14" */
export function formatRelativeDateShort(iso: string): string {
  const days = diffDays(iso);
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
      const now = new Date();
      const then = new Date(w.date);
      return Math.round((now.getTime() - then.getTime()) / 86400000);
    }
  }
  return null;
}
