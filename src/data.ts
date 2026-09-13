export type Snapshot = {
  id: string;
  name: string;
  agency: string;
  legacy_codes: string;
  state: string;
  ministry: string;
  sector: string;
  month: string;
  approval: string | null;
  start: string | null;
  original_end: string | null;
  revised_end: string | null;
  original_cost: number | null;
  revised_cost: number | null;
  expenditure: number | null;
  progress: number | null;
  source_file: string;
  source_page: number;
  quality_flags: string[];
};
export type Factor = {
  label: string;
  points: number;
  detail: string;
  action: string;
};
export type Project = Snapshot & {
  history: Snapshot[];
  score: number;
  band: string;
  factors: Factor[];
  costOverrun: number | null;
  slippage: number | null;
  expected: number | null;
  delta: number | null;
  eligible: boolean;
};
export type Source = {
  file: string;
  month: string;
  pages: number;
  extracted_records: number;
  sha256: string;
  rejected_rows: number;
};
export type Dataset = {
  snapshots: Snapshot[];
  audit: {
    sources: Source[];
    total_snapshots: number;
    unique_projects: number;
    duplicate_keys: string[][];
    quality_flags: Record<string, number>;
    rejected_rows: unknown[];
  };
};
export const monthIndex = (value: string | null) => {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [y, m] = value.split("-").map(Number);
  return y * 12 + m - 1;
};
export const fmt = (n: number | null | undefined, d = 0) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : n.toLocaleString("en-IN", { maximumFractionDigits: d });
export const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : n >= 100000
      ? `₹${(n / 100000).toFixed(2)}L cr`
      : `₹${fmt(n)} cr`;
export const date = (s: string | null) =>
  s
    ? new Date(s + "-01T00:00:00").toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : "Not reported";
export const shortMinistry = (s: string) =>
  s.replace(/^Ministry of /, "").replace(/^Department of /, "");
export function derive(data: Dataset, month: string): Project[] {
  const grouped = new Map<string, Snapshot[]>();
  data.snapshots
    .filter((r) => r.month <= month)
    .forEach((r) => grouped.set(r.id, [...(grouped.get(r.id) || []), r]));
  return data.snapshots
    .filter((r) => r.month === month)
    .map((r) => {
      const history = grouped
        .get(r.id)!
        .sort((a, b) => a.month.localeCompare(b.month));
      const prev = history.length > 1 ? history[history.length - 2] : undefined;
      const consecutive =
        !!prev && monthIndex(r.month)! - monthIndex(prev.month)! === 1;
      const now = monthIndex(r.month)!,
        start = monthIndex(r.start),
        end = monthIndex(r.original_end),
        revised = monthIndex(r.revised_end);
      const validProgress =
        r.progress != null &&
        Number.isFinite(r.progress) &&
        r.progress >= 0 &&
        r.progress <= 100;
      const expected =
        now != null && start != null && end != null && end > start
          ? Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100))
          : null;
      const slippage =
        end != null && revised != null ? Math.max(0, revised - end) : null;
      const costOverrun =
        r.original_cost != null &&
        Number.isFinite(r.original_cost) &&
        r.original_cost > 0 &&
        r.revised_cost != null &&
        Number.isFinite(r.revised_cost) &&
        r.revised_cost >= 0
          ? (r.revised_cost / r.original_cost - 1) * 100
          : null;
      const delta =
        consecutive &&
        validProgress &&
        prev?.progress != null &&
        Number.isFinite(prev.progress) &&
        prev.progress >= 0 &&
        prev.progress <= 100
          ? r.progress! - prev.progress
          : null;
      const factors: Factor[] = [];
      if (slippage != null && slippage > 0)
        factors.push({
          label: "Completion date revised",
          points: Math.min(30, Math.round(slippage * 2)),
          detail: `${slippage} months beyond the original target`,
          action:
            "Review the revised critical path and record the cause of slippage.",
        });
      if (expected != null && validProgress && expected - r.progress! > 5)
        factors.push({
          label: "Progress behind linear schedule",
          points: Math.min(35, Math.round((expected - r.progress!) * 0.6)),
          detail: `${(expected - r.progress!).toFixed(1)} percentage points below a linear assumption`,
          action:
            "Verify actual milestone weights and agree a recovery plan with the agency.",
        });
      if (costOverrun != null && costOverrun > 0)
        factors.push({
          label: "Sanctioned cost has increased",
          points: Math.min(25, Math.round(costOverrun * 0.5)),
          detail: `${costOverrun.toFixed(1)}% above original cost`,
          action:
            "Review the revised sanction and reconcile changes in scope and unit costs.",
        });
      if (delta != null && delta <= 0 && r.progress != null && r.progress < 100)
        factors.push({
          label:
            delta < 0
              ? "Reported progress decreased"
              : "No reported monthly progress",
          points: 10,
          detail: `${delta.toFixed(1)} percentage points since ${date(prev!.month)}`,
          action:
            delta < 0
              ? "Verify whether scope or progress measurement was corrected before assessing execution."
              : "Confirm whether the update is stale or execution has stalled.",
        });
      const eligible = validProgress && expected != null && costOverrun != null;
      const score = Math.min(
        100,
        factors.reduce((s, f) => s + f.points, 0),
      );
      return {
        ...r,
        history,
        score,
        eligible,
        band: !eligible
          ? "Insufficient data"
          : score >= 55
            ? "High"
            : score >= 30
              ? "Moderate"
              : "Low",
        factors: factors.sort((a, b) => b.points - a.points),
        costOverrun,
        slippage,
        expected,
        delta,
      };
    });
}
