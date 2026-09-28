import { usePrefersDark } from "../hooks/usePrefersDark";
import {
  ApplicationStatus,
  StatBreakdown,
  STATUS_TONE,
  STATUS_TONE_COLOR,
  TrackerStats as TrackerStatsData,
} from "../lib/tracker";

// Validated categorical palette (dataviz skill, references/palette.md) — fixed
// slot order per entity, never re-cycled by count/rank.
const CATEGORICAL_LIGHT = [
  "#2a78d6",
  "#008300",
  "#e87ba4",
  "#eda100",
  "#1baf7a",
  "#eb6834",
  "#4a3aa7",
  "#e34948",
];
const CATEGORICAL_DARK = [
  "#3987e5",
  "#008300",
  "#d55181",
  "#c98500",
  "#199e70",
  "#d95926",
  "#9085e9",
  "#e66767",
];

function useCategoricalColor() {
  const dark = usePrefersDark();
  const palette = dark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  return (index: number) => palette[index % palette.length];
}

function Bar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-28 shrink-0 truncate text-[11px] text-[var(--color-text-muted)]"
        title={label}
      >
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-[var(--color-text)]">
        {count}
      </span>
    </div>
  );
}

function BreakdownSection({
  title,
  items,
  colorOffset = 0,
}: {
  title: string;
  items: StatBreakdown[];
  colorOffset?: number;
}) {
  const color = useCategoricalColor();
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div>
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </h3>
      <div className="flex flex-col gap-1">
        {items.map((item, i) => (
          <Bar key={item.label} label={item.label} count={item.count} max={max} color={color(i + colorOffset)} />
        ))}
      </div>
    </div>
  );
}

export function TrackerStatsView({ stats }: { stats: TrackerStatsData }) {
  const dark = usePrefersDark();
  const maxStatus = Math.max(...stats.byStatus.map((s) => s.count), 1);
  // Colour each status by its emotional tone (wins warm, closed-negatives muted), not by an
  // arbitrary categorical slot — so the funnel reads calm and affirming at a glance.
  const statusColor = (s: ApplicationStatus) => {
    const tone = STATUS_TONE_COLOR[STATUS_TONE[s]];
    return dark ? tone.dark : tone.light;
  };

  return (
    <div className="flex flex-col gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-[var(--color-text)]">{stats.responseRatePct}%</span>
        <span className="text-xs text-[var(--color-text-muted)]">
          response rate ({stats.responded}/{stats.total})
        </span>
      </div>

      <div>
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          By Status
        </h3>
        <div className="flex flex-col gap-1">
          {stats.byStatus.map((s) => (
            <Bar
              key={s.status}
              label={s.status}
              count={s.count}
              max={maxStatus}
              color={statusColor(s.status)}
            />
          ))}
        </div>
      </div>

      <BreakdownSection title="By Platform" items={stats.byPlatform.slice(0, 8)} />
      <BreakdownSection title="By CV Version" items={stats.byCvVersion.slice(0, 8)} />
    </div>
  );
}
