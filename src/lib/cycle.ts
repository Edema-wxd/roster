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

export type CycleForPrediction = {
  startDate: string; // ISO
  endDate: string | null;
  cycleLength: number | null;
  periodLength: number | null;
};

/** Returns "logged" if dateKey falls within an actual recorded period, else null. */
export function loggedPeriodStatus(
  cycles: CycleForPrediction[],
  defaultPeriodLength: number,
  key: string,
): boolean {
  return cycles.some((cycle) => {
    const startKey = isoToKey(cycle.startDate);
    const endKey = cycle.endDate
      ? isoToKey(cycle.endDate)
      : addDaysToKey(startKey, (cycle.periodLength ?? defaultPeriodLength) - 1);
    return key >= startKey && key <= endKey;
  });
}

/** Predicts the next period window from the most recent logged cycle. */
export function predictedPeriodStatus(
  cycles: CycleForPrediction[],
  defaultCycleLength: number,
  defaultPeriodLength: number,
  key: string,
): boolean {
  if (cycles.length === 0) return false;
  const sorted = [...cycles].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const last = sorted[0];
  const lastStartKey = isoToKey(last.startDate);

  const recentLengths = sorted
    .slice(0, 6)
    .map((c) => c.cycleLength)
    .filter((n): n is number => typeof n === "number");
  const avgCycleLength =
    recentLengths.length > 0
      ? Math.round(recentLengths.reduce((a, b) => a + b, 0) / recentLengths.length)
      : defaultCycleLength;

  const predictedStartKey = addDaysToKey(lastStartKey, last.cycleLength ?? avgCycleLength);
  const predictedEndKey = addDaysToKey(
    predictedStartKey,
    (last.periodLength ?? defaultPeriodLength) - 1,
  );

  return key >= predictedStartKey && key <= predictedEndKey;
}
