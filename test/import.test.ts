import { describe, expect, test, vi } from "vitest";
import {
  MAX_IMPORT_BYTES,
  parseDashboardImport,
  readDashboardFile,
} from "../src/import";
import { demoState } from "../src/model";

describe("dashboard imports", () => {
  test("round-trips exported data, including empty dashboards and Unicode", () => {
    for (const data of [
      demoState(),
      { version: 1, demo: false, metrics: [] },
    ]) {
      expect(parseDashboardImport(JSON.stringify(data))).toEqual(data);
    }
    expect(
      parseDashboardImport("\uFEFF" + JSON.stringify(demoState())),
    ).toEqual(demoState());
  });

  test("rejects malformed JSON and unsupported schemas", () => {
    for (const text of ["", "not JSON", "{"])
      expect(() => parseDashboardImport(text)).toThrow("JSON を読み取れません");
    for (const data of [
      null,
      [],
      {},
      { ...demoState(), version: 2 },
      { ...demoState(), metrics: [null] },
    ]) {
      expect(() => parseDashboardImport(JSON.stringify(data))).toThrow(
        "対応していないデータ形式",
      );
    }
  });

  test("rejects invalid metrics, duplicate IDs, invalid dates and duplicate daily entries", () => {
    const metric = demoState().metrics[0];
    for (const metrics of [
      [{ ...metric, target: 0 }],
      [{ ...metric, color: 4 }],
      [{ ...metric, direction: "decrease", baseline: metric.target }],
      [
        {
          ...metric,
          direction: "decrease",
          baseline: metric.target + 1,
          recordingMode: "increment",
        },
      ],
      [{ ...metric, periodType: "monthly", periodStart: undefined }],
      [{ ...metric, periodType: "quarterly", periodStart: "2025-02-01" }],
      [
        {
          ...metric,
          periodType: "custom",
          periodStart: "2025-02-02",
          periodEnd: "2025-02-01",
        },
      ],
      [
        {
          ...metric,
          periodType: "monthly",
          periodStart: "2025-01-01",
          entries: [{ date: "2025-02-01", value: 1 }],
        },
      ],
      [metric, metric],
      Array.from({ length: 101 }, (_, i) => ({ ...metric, id: String(i) })),
      [{ ...metric, entries: [{ date: "2025-02-30", value: 1 }] }],
      [{ ...metric, entries: [{ date: "2099-01-01", value: 1 }] }],
      [{ ...metric, entries: [{ date: "2025-01-01", value: -1 }] }],
      [{ ...metric, entries: [metric.entries[0], metric.entries[0]] }],
    ])
      expect(() =>
        parseDashboardImport(
          JSON.stringify({ version: 1, demo: false, metrics }),
        ),
      ).toThrow();
  });

  test("only retains known fields without modifying valid record values", () => {
    const data = demoState();
    const imported = parseDashboardImport(
      JSON.stringify({
        ...data,
        extra: "ignored",
        metrics: data.metrics.map((metric) => ({ ...metric, unknown: true })),
      }),
    );
    expect(imported).toEqual(data);
  });

  test("rejects oversized files before reading them", async () => {
    const text = vi.fn();
    await expect(
      readDashboardFile({ size: MAX_IMPORT_BYTES + 1, text }),
    ).rejects.toThrow("10 MB");
    expect(text).not.toHaveBeenCalled();
  });

  test("reports unreadable files and loads files at the size limit", async () => {
    await expect(
      readDashboardFile({
        size: 100,
        text: async () => {
          throw new Error("read failed");
        },
      }),
    ).rejects.toThrow("ファイルを読み込めませんでした");
    const data = demoState();
    await expect(
      readDashboardFile({
        size: MAX_IMPORT_BYTES,
        text: async () => JSON.stringify(data),
      }),
    ).resolves.toEqual(data);
  });
});
