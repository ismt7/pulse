import { latest, periodLabel } from "./model";
import type { DashboardState } from "./types";

function safeCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function dashboardCsv(state: DashboardState): string {
  const headers = [
    "目標名",
    "方向",
    "記録方式",
    "対象期間",
    "目標値",
    "単位",
    "記録日",
    "入力値",
    "その日時点の累計・現在値",
    "達成率(%)",
  ];
  const rows = state.metrics.flatMap((metric) => {
    const entries = metric.entries.length
      ? metric.entries
      : [{ date: "", value: "" as const }];
    return entries.map((entry) => {
      const current = entry.date ? latest(metric, entry.date) : latest(metric);
      const progress =
        metric.direction === "decrease"
          ? Math.min(
              100,
              Math.max(
                0,
                (((metric.baseline ?? metric.target) - current) /
                  ((metric.baseline ?? metric.target) - metric.target)) *
                  100,
              ),
            )
          : Math.min(100, Math.max(0, (current / metric.target) * 100));
      return [
        metric.name,
        metric.direction === "decrease" ? "減らす" : "増やす",
        metric.recordingMode === "increment"
          ? "日ごとの増分"
          : "累計値・現在値",
        periodLabel(metric),
        metric.target,
        metric.unit,
        entry.date,
        entry.value,
        current,
        Math.round(progress * 100) / 100,
      ]
        .map(safeCell)
        .join(",");
    });
  });
  return `\uFEFF${headers.map(safeCell).join(",")}\r\n${rows.join("\r\n")}\r\n`;
}
