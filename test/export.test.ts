import { describe, expect, test } from "vitest";
import { dashboardCsv } from "../src/export";
import type { DashboardState } from "../src/types";

describe("CSV export", () => {
  test("exports one row per record with period and calculated cumulative values", () => {
    const state: DashboardState = {
      version: 1,
      demo: false,
      metrics: [
        {
          id: "sales",
          name: "売上,国内",
          target: 100,
          unit: "万円",
          color: 0,
          recordingMode: "increment",
          periodType: "monthly",
          periodStart: "2025-01-01",
          entries: [
            { date: "2025-01-01", value: 10 },
            { date: "2025-01-02", value: 20 },
          ],
        },
      ],
    };
    const csv = dashboardCsv(state);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"売上,国内"');
    expect(csv).toContain('"2025年1月"');
    expect(csv).toContain('"2025-01-02","20","30","30"');
    expect(csv.split("\r\n")).toHaveLength(4);
  });

  test("prevents spreadsheet formulas and includes goals without records", () => {
    const state: DashboardState = {
      version: 1,
      demo: false,
      metrics: [
        {
          id: "safe",
          name: "=CMD()",
          target: 1,
          unit: "@unit",
          color: 0,
          entries: [],
        },
      ],
    };
    const csv = dashboardCsv(state);
    expect(csv).toContain('"\'=CMD()"');
    expect(csv).toContain('"\'@unit"');
  });
});
