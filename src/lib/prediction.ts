import { addDaysToKey, daysBetweenKeys, isoToKey } from "@/lib/cycle";

export type CycleForPrediction = {
  startDate: string; // ISO
  endDate: string | null;
  cycleLength: number | null;
  periodLength: number | null;
};

export type PredictionResult = {
  predictedCycleLength: number;
  predictedVariabilityDays: number;
  predictedNextStartKey: string;
  predictedPeriodEndKey: string;
  ovulationWindowStartKey: string;
  ovulationWindowEndKey: string;
  lutealStartKey: string;
  lutealEndKey: string;
  follicularStartKey: string;
  follicularEndKey: string;
};

const MIN_VARIABILITY_DAYS = 2;
const MAX_VARIABILITY_DAYS = 7;
const DEFAULT_VARIABILITY_DAYS = 3;
const MAX_HISTORY_CYCLES = 12;

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function populationStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const variance = mean(values.map((v) => (v - avg) ** 2));
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Pure prediction function. Computes the next predicted period window plus
 * ovulation/luteal/follicular phase windows from recent cycle history.
 * Ovulation is anchored off the *next* predicted period start minus the
 * luteal phase length, since luteal length is far less variable than
 * follicular length — the standard back-calculation approach.
 */
export function computePrediction(
  cycles: CycleForPrediction[],
  defaultCycleLength: number,
  defaultPeriodLength: number,
  defaultLutealPhaseLength: number,
): PredictionResult | null {
  if (cycles.length === 0) return null;

  const sorted = [...cycles].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const recent = sorted.slice(-MAX_HISTORY_CYCLES);

  let predictedCycleLength: number;
  let predictedVariabilityDays: number;

  if (recent.length < 2) {
    predictedCycleLength = recent[0].cycleLength ?? defaultCycleLength;
    predictedVariabilityDays = DEFAULT_VARIABILITY_DAYS;
  } else {
    const lengths: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      const prevKey = isoToKey(recent[i - 1].startDate);
      const currKey = isoToKey(recent[i].startDate);
      lengths.push(recent[i].cycleLength ?? daysBetweenKeys(prevKey, currKey));
    }
    predictedCycleLength = Math.round(mean(lengths));
    predictedVariabilityDays = clamp(
      Math.round(populationStdDev(lengths)),
      MIN_VARIABILITY_DAYS,
      MAX_VARIABILITY_DAYS,
    );
  }

  const last = recent[recent.length - 1];
  const lastStartKey = isoToKey(last.startDate);
  const lastPeriodLength = last.periodLength ?? defaultPeriodLength;
  const lastPeriodEndKey = last.endDate
    ? isoToKey(last.endDate)
    : addDaysToKey(lastStartKey, lastPeriodLength - 1);

  const predictedNextStartKey = addDaysToKey(lastStartKey, predictedCycleLength);
  const predictedPeriodEndKey = addDaysToKey(predictedNextStartKey, lastPeriodLength - 1);

  const ovulationAnchorKey = addDaysToKey(predictedNextStartKey, -defaultLutealPhaseLength);
  const ovulationWindowStartKey = addDaysToKey(ovulationAnchorKey, -1);
  const ovulationWindowEndKey = addDaysToKey(ovulationAnchorKey, 1);

  const lutealStartKey = addDaysToKey(ovulationWindowEndKey, 1);
  const lutealEndKey = addDaysToKey(predictedNextStartKey, -1);

  const follicularStartKey = addDaysToKey(lastPeriodEndKey, 1);
  const follicularEndKey = addDaysToKey(ovulationWindowStartKey, -1);

  return {
    predictedCycleLength,
    predictedVariabilityDays,
    predictedNextStartKey,
    predictedPeriodEndKey,
    ovulationWindowStartKey,
    ovulationWindowEndKey,
    lutealStartKey,
    lutealEndKey,
    follicularStartKey,
    follicularEndKey,
  };
}

export type CyclePhase = "menstrual" | "ovulation" | "luteal" | "follicular";

export function loggedMenstrualStatus(
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

/** Phase for a given day: "logged" menstrual days take priority over predictions. */
export function phaseForDate(
  cycles: CycleForPrediction[],
  prediction: PredictionResult | null,
  defaultPeriodLength: number,
  key: string,
): { phase: CyclePhase; predicted: boolean } | null {
  if (loggedMenstrualStatus(cycles, defaultPeriodLength, key)) {
    return { phase: "menstrual", predicted: false };
  }
  if (!prediction) return null;

  if (key >= prediction.predictedNextStartKey && key <= prediction.predictedPeriodEndKey) {
    return { phase: "menstrual", predicted: true };
  }
  if (key >= prediction.ovulationWindowStartKey && key <= prediction.ovulationWindowEndKey) {
    return { phase: "ovulation", predicted: true };
  }
  if (key >= prediction.lutealStartKey && key <= prediction.lutealEndKey) {
    return { phase: "luteal", predicted: true };
  }
  if (key >= prediction.follicularStartKey && key <= prediction.follicularEndKey) {
    return { phase: "follicular", predicted: true };
  }
  return null;
}

/** "Day N — Phase" label for the current-phase indicator on the person detail page. */
export function currentPhaseLabel(
  cycles: CycleForPrediction[],
  prediction: PredictionResult | null,
  defaultPeriodLength: number,
  todayKey: string,
): string | null {
  const result = phaseForDate(cycles, prediction, defaultPeriodLength, todayKey);
  if (!result) return null;

  const sorted = [...cycles].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const lastStartKey = sorted.length > 0 ? isoToKey(sorted[0].startDate) : null;
  const dayNumber = lastStartKey ? daysBetweenKeys(lastStartKey, todayKey) + 1 : null;

  const phaseLabel =
    result.phase === "menstrual"
      ? "Menstrual"
      : result.phase === "ovulation"
        ? "Ovulation (estimated)"
        : result.phase === "luteal"
          ? "Luteal (estimated)"
          : "Follicular (estimated)";

  return dayNumber && dayNumber > 0 ? `Day ${dayNumber} · ${phaseLabel}` : phaseLabel;
}

export type PartnerCycleStatus = {
  phase: CyclePhase;
  predicted: boolean;
  /** 1-based day within the partner's current cycle, for the dial fill + "day N" label. */
  dayNumber: number;
  /** Denominator for the dial fill fraction. */
  cycleLength: number;
  /** Days until the next predicted period start; null while a period is underway. */
  nextPeriodInDays: number | null;
};

// A partner whose last period was logged more than this many cycles ago is
// treated as "no recent cycle" — projecting a phase that far past real data
// would be a confident guess the card shouldn't make.
const MAX_STALE_CYCLES = 2;

/** Phase for a given 0-based day within a cycle — the same windows the trends
 * chart uses, so a partner shown mid-follicular there reads the same here. */
function phaseForCycleDay(
  d: number,
  cycleLength: number,
  periodLength: number,
  lutealPhaseLength: number,
): CyclePhase {
  const periodEnd = periodLength - 1;
  const ovulationCenter = cycleLength - lutealPhaseLength;
  const ovulationStart = Math.max(periodEnd + 1, ovulationCenter - 1);
  const ovulationEnd = Math.max(ovulationStart, ovulationCenter + 1);
  if (d <= periodEnd) return "menstrual";
  if (d < ovulationStart) return "follicular";
  if (d <= ovulationEnd) return "ovulation";
  return "luteal";
}

/**
 * The at-a-glance status a partner card needs: which phase they're in today,
 * how far into the current cycle (for the dial), and how soon the next period
 * is. Rolls the last logged period forward by the predicted cycle length to
 * locate the cycle containing today, so a partner whose last log is a few
 * cycles back still reads correctly. Returns null when there's no history at
 * all, or when the last log is too stale to place today with confidence.
 */
export function partnerCycleStatus(
  cycles: CycleForPrediction[],
  defaultCycleLength: number,
  defaultPeriodLength: number,
  defaultLutealPhaseLength: number,
  todayKey: string,
): PartnerCycleStatus | null {
  const prediction = computePrediction(
    cycles,
    defaultCycleLength,
    defaultPeriodLength,
    defaultLutealPhaseLength,
  );
  if (!prediction) return null;

  const cycleLength = prediction.predictedCycleLength;
  const sorted = [...cycles].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const lastStartKey = isoToKey(sorted[sorted.length - 1].startDate);
  const lastPeriodLength = sorted[sorted.length - 1].periodLength ?? defaultPeriodLength;

  if (daysBetweenKeys(lastStartKey, todayKey) > MAX_STALE_CYCLES * cycleLength) {
    return null;
  }

  // Roll forward to the start of the cycle that contains today.
  let currentStartKey = lastStartKey;
  while (daysBetweenKeys(addDaysToKey(currentStartKey, cycleLength), todayKey) >= 0) {
    currentStartKey = addDaysToKey(currentStartKey, cycleLength);
  }
  // Today could sit before the earliest logged start (a back-dated entry);
  // clamp the day index so the dial and label stay sane.
  const d = Math.max(0, daysBetweenKeys(currentStartKey, todayKey));
  const phase = phaseForCycleDay(d, cycleLength, lastPeriodLength, defaultLutealPhaseLength);

  const nextStartKey = addDaysToKey(currentStartKey, cycleLength);
  const nextPeriodInDays =
    phase === "menstrual" ? null : Math.max(0, daysBetweenKeys(todayKey, nextStartKey));

  return {
    phase,
    predicted: !(phase === "menstrual" && loggedMenstrualStatus(cycles, defaultPeriodLength, todayKey)),
    dayNumber: d + 1,
    cycleLength,
    nextPeriodInDays,
  };
}

export type CyclePhasePoint = {
  date: string;
  height: number; // 0 = menstrual (lowest), 1 = ovulation (highest)
  phase: CyclePhase;
  predicted: boolean;
};

/**
 * Per-day phase "height" for every date in [rangeStartKey, rangeEndKey] — a
 * repeating hill per cycle, floored at 0 for menstrual and peaking at 1 for
 * ovulation, ramping through follicular (rising) and luteal (falling)
 * between them, so a trend chart can plot the actual phase shape and label
 * it on hover.
 *
 * Anchored on logged cycle starts first, then predicted future starts
 * extended out to rangeEndKey so the shape continues smoothly past the
 * last logged period.
 */
export function cyclePhaseProgression(
  cycles: CycleForPrediction[],
  defaultCycleLength: number,
  defaultPeriodLength: number,
  defaultLutealPhaseLength: number,
  rangeStartKey: string,
  rangeEndKey: string,
): CyclePhasePoint[] {
  const sortedCycles = [...cycles].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  type Segment = { key: string; periodLength: number; predicted: boolean };
  const segments: Segment[] = sortedCycles
    .map((c) => ({
      key: isoToKey(c.startDate),
      periodLength: c.periodLength ?? defaultPeriodLength,
      predicted: false,
    }))
    .filter((s) => s.key <= rangeEndKey);

  const prediction = computePrediction(
    cycles,
    defaultCycleLength,
    defaultPeriodLength,
    defaultLutealPhaseLength,
  );

  if (prediction) {
    const lastPeriodLength =
      sortedCycles[sortedCycles.length - 1]?.periodLength ?? defaultPeriodLength;
    let nextKey = prediction.predictedNextStartKey;
    while (nextKey <= rangeEndKey) {
      segments.push({ key: nextKey, periodLength: lastPeriodLength, predicted: true });
      nextKey = addDaysToKey(nextKey, prediction.predictedCycleLength);
    }
  }
  segments.sort((a, b) => (a.key < b.key ? -1 : 1));

  if (segments.length === 0) return [];

  const fallbackCycleLength = prediction?.predictedCycleLength ?? defaultCycleLength;

  const points: CyclePhasePoint[] = [];
  let segmentIndex = 0;
  let key = rangeStartKey;
  while (key <= rangeEndKey) {
    while (segmentIndex + 1 < segments.length && segments[segmentIndex + 1].key <= key) {
      segmentIndex++;
    }
    const segment = segments[segmentIndex];
    if (segment.key <= key) {
      const nextSegment = segments[segmentIndex + 1];
      const cycleLength = nextSegment
        ? daysBetweenKeys(segment.key, nextSegment.key)
        : fallbackCycleLength;
      const d = daysBetweenKeys(segment.key, key);

      const periodEnd = segment.periodLength - 1;
      const ovulationCenter = cycleLength - defaultLutealPhaseLength;
      const ovulationStart = Math.max(periodEnd + 1, ovulationCenter - 1);
      const ovulationEnd = Math.max(ovulationStart, ovulationCenter + 1);
      const lutealEnd = cycleLength - 1;

      let phase: CyclePhase;
      let height: number;
      if (d <= periodEnd) {
        phase = "menstrual";
        height = 0;
      } else if (d < ovulationStart) {
        phase = "follicular";
        const span = ovulationStart - (periodEnd + 1);
        height = span > 0 ? (d - (periodEnd + 1)) / span : 1;
      } else if (d <= ovulationEnd) {
        phase = "ovulation";
        height = 1;
      } else {
        phase = "luteal";
        const span = lutealEnd - ovulationEnd;
        height = span > 0 ? 1 - (d - ovulationEnd) / span : 0;
      }

      points.push({
        date: key,
        height: Math.min(1, Math.max(0, height)),
        phase,
        predicted: segment.predicted || phase !== "menstrual",
      });
    }
    key = addDaysToKey(key, 1);
  }
  return points;
}

export type CycleLengthPoint = { startDate: string; length: number };

/** Per-cycle length over time — explicit `cycleLength` where set, otherwise
 * the gap to the next logged cycle's start (mirrors computePrediction's
 * fallback). The most recent cycle has no "next start" to fall back on, so
 * it's only included when its length was explicitly logged. */
export function cycleLengthHistory(cycles: CycleForPrediction[]): CycleLengthPoint[] {
  const sorted = [...cycles].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const points: CycleLengthPoint[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const startKey = isoToKey(sorted[i].startDate);
    let length = sorted[i].cycleLength;
    if (length == null && i + 1 < sorted.length) {
      length = daysBetweenKeys(startKey, isoToKey(sorted[i + 1].startDate));
    }
    if (length != null) points.push({ startDate: startKey, length });
  }
  return points;
}
