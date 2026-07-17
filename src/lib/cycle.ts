// All dates in this module are treated as date-only "YYYY-MM-DD" keys,
// deliberately ignoring timezone/time-of-day so a logged period day means
// the same calendar day no matter where the app is viewed from.

export function dateKey(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function isoToKey(iso: string): string {
  return iso.slice(0, 10);
}

/** "HH:MM" straight off the stored ISO string (which is always written in UTC
 * for a given wall-clock time, see toScheduledAt in dashboard/actions.ts) —
 * avoids re-interpreting through the viewer's local timezone. */
export function isoToTime(iso: string): string {
  return iso.slice(11, 16);
}

function keyToUTCDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDaysToKey(key: string, days: number): string {
  const date = keyToUTCDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetweenKeys(a: string, b: string): number {
  const diff = keyToUTCDate(b).getTime() - keyToUTCDate(a).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
