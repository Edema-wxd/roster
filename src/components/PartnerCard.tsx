import Link from "next/link";
import { TriangleAlert, Utensils } from "lucide-react";
import type { CyclePhase, PartnerCycleStatus } from "@/lib/prediction";

export type PartnerCardData = {
  id: string;
  name: string;
  color: string;
  cycleTrackingEnabled: boolean;
  allergies: string | null;
  foodPreferences: string | null;
  hasCycles: boolean;
  status: PartnerCycleStatus | null;
};

// Dial arc color per phase — a wine → rose → blush ramp ordered by cycle
// progression (menstrual darkest, ovulation brightest, luteal softest). Same
// hue family as the calendar's phase encoding (Design.md §5); the dial fills
// the whole arc so follicular gets a visible mid-tone rather than the
// calendar's hollow outline.
const DIAL_PHASE_COLOR: Record<CyclePhase, string> = {
  menstrual: "#773344",
  follicular: "#b65c68",
  ovulation: "#d44d5c",
  luteal: "#e3b5a4",
};

const PHASE_LABEL: Record<CyclePhase, string> = {
  menstrual: "Period",
  follicular: "Follicular",
  ovulation: "Ovulation",
  luteal: "Luteal",
};

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function pointOnRing(fraction: number, radius: number, cx = 50, cy = 50) {
  const angle = fraction * 2 * Math.PI - Math.PI / 2; // start at 12 o'clock
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function CycleDial({
  status,
  color,
  initial,
}: {
  status: PartnerCycleStatus | null;
  color: string;
  initial: string;
}) {
  const r = 43;
  const circumference = 2 * Math.PI * r;
  const fraction = status ? Math.min(1, Math.max(0, status.dayNumber / status.cycleLength)) : 0;
  const knob = pointOnRing(fraction, r);
  const arcColor = status ? DIAL_PHASE_COLOR[status.phase] : "var(--color-border)";

  return (
    <svg viewBox="0 0 100 100" className="h-16 w-16 shrink-0" aria-hidden>
      {/* track */}
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth="7" opacity="0.35" />
      {/* progress arc */}
      {status && (
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={arcColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          transform="rotate(-90 50 50)"
        />
      )}
      {/* today marker */}
      {status && (
        <circle cx={knob.x} cy={knob.y} r="6" fill={arcColor} stroke="var(--color-card)" strokeWidth="3" />
      )}
      {/* identity center */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fill: color, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "30px" }}
      >
        {initial}
      </text>
    </svg>
  );
}

function IdentityAvatar({ color, initial }: { color: string; initial: string }) {
  return (
    <span
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2"
      style={{ borderColor: color, color, backgroundColor: `${color}1a` }}
    >
      <span className="font-display text-2xl font-semibold">{initial}</span>
    </span>
  );
}

function CareChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs text-foreground/70">
      <span className="text-foreground/40">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function PartnerCard({ partner }: { partner: PartnerCardData }) {
  const initial = initialOf(partner.name);
  const { status } = partner;
  const hasCareNotes = Boolean(partner.allergies || partner.foodPreferences);

  return (
    <Link
      href={`/people/${partner.id}`}
      className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/70 focus-visible:-translate-y-0.5 focus-visible:border-primary focus-visible:outline-none"
    >
      <div className="flex items-center gap-4">
        {partner.cycleTrackingEnabled ? (
          <CycleDial status={status} color={partner.color} initial={initial} />
        ) : (
          <IdentityAvatar color={partner.color} initial={initial} />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold text-foreground">
            {partner.name}
          </p>

          {partner.cycleTrackingEnabled && status ? (
            <>
              <p className="text-sm text-foreground/80">
                {PHASE_LABEL[status.phase]} · Day {status.dayNumber}
                {status.predicted && <span className="text-foreground/40"> · est.</span>}
              </p>
              {status.nextPeriodInDays !== null && (
                <p className="text-xs text-foreground/50">
                  {status.nextPeriodInDays === 0
                    ? "Period expected today"
                    : `Period in ${status.nextPeriodInDays} day${status.nextPeriodInDays === 1 ? "" : "s"}`}
                </p>
              )}
            </>
          ) : partner.cycleTrackingEnabled ? (
            <p className="text-sm text-foreground/50">
              {partner.hasCycles ? "No recent cycle" : "No cycle logged yet"}
            </p>
          ) : (
            <p className="text-sm text-foreground/50">Not tracking a cycle</p>
          )}
        </div>
      </div>

      {hasCareNotes && (
        <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
          <div className="flex flex-wrap gap-2">
            {partner.allergies && (
              <CareChip icon={<TriangleAlert className="h-3 w-3" />}>{partner.allergies}</CareChip>
            )}
            {partner.foodPreferences && (
              <CareChip icon={<Utensils className="h-3 w-3" />}>{partner.foodPreferences}</CareChip>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
