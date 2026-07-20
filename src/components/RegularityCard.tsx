function mean(v: number[]): number {
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function stdev(v: number[]): number {
  const m = mean(v);
  return Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
}

function regularityLabel(count: number, sd: number): string {
  if (count < 2) return "Not enough history yet";
  if (sd <= 1) return "Very regular";
  if (sd <= 3) return "Fairly regular";
  return "Varies a lot";
}

/** How predictable a partner's cycle has been — a plain-language read plus a
 * dot strip of logged lengths, rather than a jagged 2-point line chart. */
export function RegularityCard({
  name,
  color,
  defaultCycleLength,
  lengths,
}: {
  name: string;
  color: string;
  defaultCycleLength: number;
  lengths: number[];
}) {
  const count = lengths.length;
  const avg = count > 0 ? Math.round(mean(lengths)) : defaultCycleLength;
  const sd = count >= 2 ? stdev(lengths) : 0;
  const label = regularityLabel(count, sd);

  // Dot-strip scale: pad a couple days beyond the observed spread.
  const lo = count >= 2 ? Math.min(...lengths) - 1 : avg - 3;
  const hi = count >= 2 ? Math.max(...lengths) + 1 : avg + 3;
  const span = Math.max(1, hi - lo);
  const posOf = (v: number) => ((v - lo) / span) * 100;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate font-display text-base font-semibold text-foreground">
          {name}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-semibold text-foreground">{avg}</span>
        <span className="text-sm text-foreground/60">
          day{avg === 1 ? "" : "s"}
          {count === 0 && " (default)"}
        </span>
        {count >= 2 && (
          <span className="ml-1 text-sm text-foreground/50">± {Math.round(sd)}</span>
        )}
      </div>

      <p className="text-sm text-foreground/70">{label}</p>

      {count >= 2 ? (
        <div className="relative mt-1 h-6">
          <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-border/60" />
          {/* average marker */}
          <div
            className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-foreground/30"
            style={{ left: `${posOf(avg)}%` }}
          />
          {lengths.map((len, i) => (
            <div
              key={i}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card"
              style={{ left: `${posOf(len)}%`, backgroundColor: color }}
              title={`${len} days`}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-foreground/45">
          {count === 1
            ? "Log another period to see how regular her cycle is."
            : "Log a couple of periods and her rhythm will show up here."}
        </p>
      )}
    </div>
  );
}
