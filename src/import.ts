import { isValidState, normalizeState } from "./model";
import type { DashboardState } from "./types";

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export function parseDashboardImport(text: string): DashboardState {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error(
      "JSON を読み取れません。Pulse から書き出したファイルを選択してください。",
    );
  }
  if (!isValidState(data)) {
    throw new Error(
      "対応していないデータ形式、または不正な目標・記録が含まれています。Pulse のバージョン1のバックアップを選択してください。",
    );
  }
  // Restore only known fields, rather than retaining arbitrary JSON properties.
  return normalizeState({
    version: 1,
    demo: data.demo,
    metrics: data.metrics.map(
      ({
        id,
        name,
        target,
        unit,
        color,
        recordingMode,
        direction,
        baseline,
        periodType,
        periodStart,
        periodEnd,
        entries,
      }) => {
        if (
          new Set(entries.map((entry) => entry.date)).size !== entries.length
        ) {
          throw new Error(
            "同じ目標に同じ日付の記録が複数あります。ファイルを確認してください。",
          );
        }
        return {
          id,
          name,
          target,
          unit,
          color,
          recordingMode: recordingMode ?? "cumulative",
          direction: direction ?? "increase",
          ...(direction === "decrease" ? { baseline } : {}),
          periodType: periodType ?? "all",
          ...(periodType === "monthly" || periodType === "quarterly"
            ? { periodStart }
            : periodType === "custom"
              ? { periodStart, periodEnd }
              : {}),
          entries: entries.map(({ date, value }) => ({ date, value })),
        };
      },
    ),
  });
}

export async function readDashboardFile(
  file: Pick<File, "size" | "text">,
): Promise<DashboardState> {
  if (file.size > MAX_IMPORT_BYTES)
    throw new Error("ファイルは10 MB以下のものを選択してください。");
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error(
      "ファイルを読み込めませんでした。もう一度選択してください。",
    );
  }
  return parseDashboardImport(text);
}
