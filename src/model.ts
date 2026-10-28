import type { DashboardState, Metric, MetricFields } from "./types";

// Preserve the original key and schema for dashboards saved before the migration.
export const STORAGE_KEY = "pulse.dashboard.v1";
export const today = () => localDate(new Date());

function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function days(count: number, end = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(end);
    date.setDate(date.getDate() - count + i + 1);
    return localDate(date);
  });
}

export function periodBounds(
  metric: Pick<Metric, "periodType" | "periodStart" | "periodEnd">,
): { start?: string; end?: string } {
  if (!metric.periodType || metric.periodType === "all" || !metric.periodStart)
    return {};
  if (metric.periodType === "custom")
    return { start: metric.periodStart, end: metric.periodEnd };
  const [year, month] = metric.periodStart.split("-").map(Number);
  const months = metric.periodType === "quarterly" ? 3 : 1;
  return {
    start: metric.periodStart,
    end: localDate(new Date(year, month - 1 + months, 0)),
  };
}

export function periodLabel(
  metric: Pick<Metric, "periodType" | "periodStart" | "periodEnd">,
): string {
  const type = metric.periodType ?? "all";
  if (type === "all" || !metric.periodStart) return "期間なし";
  if (type === "custom")
    return `${metric.periodStart.replaceAll("-", "/")}〜${(metric.periodEnd ?? "").replaceAll("-", "/")}`;
  const [year, month] = metric.periodStart.split("-").map(Number);
  return type === "monthly"
    ? `${year}年${month}月`
    : `${year}年 第${Math.floor((month - 1) / 3) + 1}四半期`;
}

export function periodStatus(
  metric: Metric,
  date = today(),
): "future" | "active" | "ended" | "all" {
  const { start, end } = periodBounds(metric);
  if (!start || !end) return "all";
  if (date < start) return "future";
  if (date > end) return "ended";
  return "active";
}

function dateFromLocal(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function nextPeriod(
  metric: Metric,
): Pick<Metric, "periodType" | "periodStart" | "periodEnd"> {
  const type = metric.periodType ?? "all";
  if (type === "all" || !metric.periodStart) return { periodType: "all" };
  if (type === "monthly" || type === "quarterly") {
    const start = dateFromLocal(metric.periodStart);
    start.setMonth(start.getMonth() + (type === "monthly" ? 1 : 3));
    return { periodType: type, periodStart: localDate(start) };
  }
  const bounds = periodBounds(metric);
  if (!bounds.start || !bounds.end) return { periodType: "all" };
  const start = dateFromLocal(bounds.start);
  const end = dateFromLocal(bounds.end);
  const duration = end.getTime() - start.getTime();
  const nextStart = new Date(end);
  nextStart.setDate(nextStart.getDate() + 1);
  return {
    periodType: "custom",
    periodStart: localDate(nextStart),
    periodEnd: localDate(new Date(nextStart.getTime() + duration)),
  };
}

export function latest(metric: Metric, date = today()): number {
  const { start, end } = periodBounds(metric);
  const effectiveDate = end && date > end ? end : date;
  const entries = metric.entries
    .filter(
      (entry) => entry.date <= effectiveDate && (!start || entry.date >= start),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  return metric.recordingMode === "increment"
    ? entries.reduce((sum, entry) => sum + entry.value, 0)
    : (entries.at(-1)?.value ??
        (metric.direction === "decrease" ? (metric.baseline ?? 0) : 0));
}
export function entryValue(metric: Metric, date: string): number {
  return metric.entries.find((entry) => entry.date === date)?.value ?? 0;
}
export const progress = (metric: Metric, date?: string): number => {
  if (metric.direction === "decrease") {
    const baseline = metric.baseline ?? metric.target;
    const distance = baseline - metric.target;
    return distance > 0
      ? Math.min(
          100,
          Math.max(0, ((baseline - latest(metric, date)) / distance) * 100),
        )
      : 0;
  }
  return Math.min(
    100,
    Math.max(0, (latest(metric, date) / metric.target) * 100),
  );
};
export const average = (metrics: Metric[], date?: string): number =>
  metrics.length
    ? Math.round(
        metrics.reduce((sum, metric) => sum + progress(metric, date), 0) /
          metrics.length,
      )
    : 0;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateMetric(
  fields: unknown,
): asserts fields is MetricFields {
  if (
    !isObject(fields) ||
    typeof fields.name !== "string" ||
    !fields.name.trim() ||
    fields.name.trim().length > 40
  ) {
    throw new Error("名前は1〜40文字で入力してください。");
  }
  if (
    typeof fields.target !== "number" ||
    !Number.isFinite(fields.target) ||
    fields.target <= 0 ||
    fields.target > 1e12
  ) {
    throw new Error("目標は0より大きく、1兆以下の数値で入力してください。");
  }
  if (typeof fields.unit !== "string" || fields.unit.length > 10)
    throw new Error("単位は10文字以内で入力してください。");
  if (
    fields.recordingMode !== undefined &&
    fields.recordingMode !== "cumulative" &&
    fields.recordingMode !== "increment"
  )
    throw new Error("記録方式が正しくありません。");
  if (
    fields.direction !== undefined &&
    fields.direction !== "increase" &&
    fields.direction !== "decrease"
  )
    throw new Error("目標の方向が正しくありません。");
  if (
    fields.periodType !== undefined &&
    fields.periodType !== "all" &&
    fields.periodType !== "monthly" &&
    fields.periodType !== "quarterly" &&
    fields.periodType !== "custom"
  )
    throw new Error("目標期間が正しくありません。");
  if (fields.periodType === "custom") {
    if (
      !validDate(fields.periodStart) ||
      !validDate(fields.periodEnd) ||
      fields.periodStart > fields.periodEnd
    )
      throw new Error("任意期間の開始日と終了日を正しく入力してください。");
  } else if (fields.periodType && fields.periodType !== "all") {
    if (
      !validDate(fields.periodStart) ||
      !String(fields.periodStart).endsWith("-01")
    )
      throw new Error("対象期間の開始月を選択してください。");
    const month = Number(String(fields.periodStart).slice(5, 7));
    if (fields.periodType === "quarterly" && ![1, 4, 7, 10].includes(month))
      throw new Error("四半期の開始月が正しくありません。");
  }
  if (fields.direction === "decrease") {
    if (
      typeof fields.baseline !== "number" ||
      !Number.isFinite(fields.baseline) ||
      fields.baseline <= fields.target ||
      fields.baseline > 1e12
    )
      throw new Error(
        "減らす目標の開始値は、目標値より大きく1兆以下で入力してください。",
      );
    if (fields.recordingMode === "increment")
      throw new Error("減らす目標は累計値・現在値で記録してください。");
  }
}

export function record(
  metric: Metric,
  date: string,
  value: number | string,
): Metric {
  if (!validDate(date) || date > today())
    throw new Error("今日以前の有効な日付を入力してください。");
  const { start, end } = periodBounds(metric);
  if ((start && date < start) || (end && date > end))
    throw new Error("対象期間内の日付を入力してください。");
  if (
    String(value).trim() === "" ||
    !Number.isFinite(Number(value)) ||
    Number(value) < 0 ||
    Number(value) > 1e12
  ) {
    throw new Error("実績は0〜1兆の数値で入力してください。");
  }
  return {
    ...metric,
    entries: [
      ...metric.entries.filter((entry) => entry.date !== date),
      { date, value: Number(value) },
    ].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function isValidState(data: unknown): data is DashboardState {
  if (
    !isObject(data) ||
    data.version !== 1 ||
    typeof data.demo !== "boolean" ||
    !Array.isArray(data.metrics) ||
    data.metrics.length > 100
  )
    return false;
  const ids = new Set<string>();
  return data.metrics.every((metric: unknown) => {
    try {
      validateMetric(metric);
    } catch {
      return false;
    }
    if (
      !isObject(metric) ||
      typeof metric.id !== "string" ||
      !metric.id ||
      ids.has(metric.id) ||
      typeof metric.color !== "number" ||
      !Number.isInteger(metric.color) ||
      metric.color < 0 ||
      metric.color > 3 ||
      !Array.isArray(metric.entries)
    )
      return false;
    ids.add(metric.id);
    const { start, end } = periodBounds(metric as unknown as Metric);
    return metric.entries.every(
      (entry: unknown) =>
        isObject(entry) &&
        validDate(entry.date) &&
        entry.date <= today() &&
        typeof entry.value === "number" &&
        Number.isFinite(entry.value) &&
        entry.value >= 0 &&
        entry.value <= 1e12 &&
        (!start || entry.date >= start) &&
        (!end || entry.date <= end),
    );
  });
}

export function normalizeState(state: DashboardState): DashboardState {
  return {
    ...state,
    metrics: state.metrics.map((metric) => ({
      ...metric,
      recordingMode: metric.recordingMode ?? "cumulative",
      direction: metric.direction ?? "increase",
      periodType: metric.periodType ?? "all",
    })),
  };
}

export function demoState(): DashboardState {
  const dates = days(7);
  const samples: (Omit<Metric, "entries"> & { values: number[] })[] = [
    {
      id: "reading",
      name: "本を読む",
      unit: "ページ",
      target: 500,
      color: 0,
      recordingMode: "cumulative",
      direction: "increase",
      periodType: "all",
      values: [150, 180, 210, 250, 290, 320, 360],
    },
    {
      id: "exercise",
      name: "からだを動かす",
      unit: "回",
      target: 12,
      color: 1,
      recordingMode: "cumulative",
      direction: "increase",
      periodType: "all",
      values: [3, 4, 4, 5, 6, 7, 9],
    },
    {
      id: "learning",
      name: "学びの時間",
      unit: "時間",
      target: 20,
      color: 2,
      recordingMode: "cumulative",
      direction: "increase",
      periodType: "all",
      values: [6, 8, 10, 12, 14, 16, 20],
    },
    {
      id: "creation",
      name: "アイデアをかたちに",
      unit: "個",
      target: 10,
      color: 3,
      recordingMode: "cumulative",
      direction: "increase",
      periodType: "all",
      values: [0, 1, 2, 2, 3, 3, 4],
    },
  ];
  return {
    version: 1,
    demo: true,
    metrics: samples.map(({ values, ...metric }) => ({
      ...metric,
      entries: dates.map((date, i) => ({ date, value: values[i] })),
    })),
  };
}
