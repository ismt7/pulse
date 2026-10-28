import { expect, test } from "vitest";
import type { Metric } from "../src/types";
import assert from "node:assert/strict";
import {
  demoState,
  isValidState,
  latest,
  progress,
  average,
  record,
  validateMetric,
  today,
  days,
  periodBounds,
  periodLabel,
  nextPeriod,
} from "../src/model";

test("sample data is valid and the summary reflects actual records", () => {
  const state = demoState();
  assert.ok(isValidState(state));
  assert.equal(average(state.metrics), 72);
  assert.equal(latest(state.metrics[0]), 360);
  assert.equal(progress(state.metrics[2]), 100);
});
test("records replace the same day; historical updates do not replace a newer total", () => {
  const metric: Metric = {
    id: "test",
    name: "Reading",
    target: 100,
    unit: "pages",
    color: 0,
    entries: [],
  };
  const yesterday = days(2)[0];
  let updated = record(metric, today(), 70);
  updated = record(updated, yesterday, 30);
  assert.equal(latest(updated), 70);
  assert.equal(latest(updated, yesterday), 30);
  updated = record(updated, today(), 110);
  assert.equal(updated.entries.length, 2);
  assert.equal(latest(updated), 110);
  assert.equal(progress(updated), 100);
  assert.equal(latest(metric), 0);
});

test("increment records are summed through the selected date and replace the same day", () => {
  const metric: Metric = {
    id: "daily",
    name: "Daily reading",
    target: 100,
    unit: "pages",
    color: 0,
    recordingMode: "increment",
    entries: [
      { date: "2025-01-01", value: 10 },
      { date: "2025-01-03", value: 30 },
    ],
  };
  expect(latest(metric, "2025-01-01")).toBe(10);
  expect(latest(metric, "2025-01-02")).toBe(10);
  expect(latest(metric, "2025-01-03")).toBe(40);
  const updated = record(metric, "2025-01-01", 15);
  expect(updated.entries).toHaveLength(2);
  expect(latest(updated, "2025-01-03")).toBe(45);
  expect(progress(updated, "2025-01-03")).toBe(45);
});

test("legacy metrics without a recording mode keep cumulative semantics", () => {
  const metric: Metric = {
    id: "legacy",
    name: "Legacy",
    target: 100,
    unit: "pages",
    color: 0,
    entries: [
      { date: "2025-01-01", value: 10 },
      { date: "2025-01-02", value: 30 },
    ],
  };
  expect(latest(metric, "2025-01-02")).toBe(30);
});

test("decrease goals start at zero progress and advance toward the lower target", () => {
  const metric: Metric = {
    id: "weight",
    name: "Weight",
    target: 70,
    baseline: 80,
    direction: "decrease",
    recordingMode: "cumulative",
    unit: "kg",
    color: 0,
    entries: [],
  };
  expect(latest(metric)).toBe(80);
  expect(progress(metric)).toBe(0);
  expect(progress(record(metric, "2025-01-01", 75), "2025-01-01")).toBe(50);
  expect(progress(record(metric, "2025-01-01", 70), "2025-01-01")).toBe(100);
  expect(progress(record(metric, "2025-01-01", 65), "2025-01-01")).toBe(100);
  expect(progress(record(metric, "2025-01-01", 85), "2025-01-01")).toBe(0);
});

test("decrease goals require a baseline above the target and current-value recording", () => {
  for (const fields of [
    {
      name: "Weight",
      unit: "kg",
      target: 70,
      direction: "decrease",
      recordingMode: "cumulative",
    },
    {
      name: "Weight",
      unit: "kg",
      target: 70,
      baseline: 70,
      direction: "decrease",
      recordingMode: "cumulative",
    },
    {
      name: "Weight",
      unit: "kg",
      target: 70,
      baseline: 80,
      direction: "decrease",
      recordingMode: "increment",
    },
  ])
    expect(() => validateMetric(fields)).toThrow();
});

test("monthly goals only aggregate records in their calendar month", () => {
  const metric: Metric = {
    id: "monthly",
    name: "Monthly sales",
    target: 100,
    unit: "orders",
    color: 0,
    recordingMode: "increment",
    periodType: "monthly",
    periodStart: "2025-01-01",
    entries: [
      { date: "2025-01-01", value: 10 },
      { date: "2025-01-31", value: 20 },
    ],
  };
  expect(periodBounds(metric)).toEqual({
    start: "2025-01-01",
    end: "2025-01-31",
  });
  expect(periodLabel(metric)).toBe("2025年1月");
  expect(latest(metric, "2024-12-31")).toBe(0);
  expect(latest(metric, "2025-01-15")).toBe(10);
  expect(latest(metric, "2025-02-15")).toBe(30);
  expect(() => record(metric, "2024-12-31", 5)).toThrow("対象期間内");
  expect(() => record(metric, "2025-02-01", 5)).toThrow("対象期間内");
});

test("quarterly goals use calendar quarter boundaries", () => {
  const metric: Metric = {
    id: "quarterly",
    name: "Quarterly sales",
    target: 100,
    unit: "orders",
    color: 0,
    periodType: "quarterly",
    periodStart: "2025-04-01",
    entries: [],
  };
  expect(periodBounds(metric)).toEqual({
    start: "2025-04-01",
    end: "2025-06-30",
  });
  expect(periodLabel(metric)).toBe("2025年 第2四半期");
  expect(() =>
    validateMetric({ ...metric, periodStart: "2025-05-01" }),
  ).toThrow("四半期");
});

test("custom periods use exact dates and roll forward by the same duration", () => {
  const metric: Metric = {
    id: "campaign",
    name: "Campaign",
    target: 10,
    unit: "sales",
    color: 0,
    periodType: "custom",
    periodStart: "2025-01-10",
    periodEnd: "2025-01-20",
    entries: [],
  };
  expect(periodBounds(metric)).toEqual({
    start: "2025-01-10",
    end: "2025-01-20",
  });
  expect(periodLabel(metric)).toBe("2025/01/10〜2025/01/20");
  expect(nextPeriod(metric)).toEqual({
    periodType: "custom",
    periodStart: "2025-01-21",
    periodEnd: "2025-01-31",
  });
  expect(() => validateMetric({ ...metric, periodEnd: "2025-01-09" })).toThrow(
    "任意期間",
  );
});

test("monthly and quarterly periods roll forward to the next calendar period", () => {
  expect(
    nextPeriod({
      id: "m",
      name: "m",
      target: 1,
      unit: "",
      color: 0,
      entries: [],
      periodType: "monthly",
      periodStart: "2025-12-01",
    }),
  ).toMatchObject({ periodStart: "2026-01-01" });
  expect(
    nextPeriod({
      id: "q",
      name: "q",
      target: 1,
      unit: "",
      color: 0,
      entries: [],
      periodType: "quarterly",
      periodStart: "2025-10-01",
    }),
  ).toMatchObject({ periodStart: "2026-01-01" });
});
test("invalid targets and records cannot corrupt progress calculations", () => {
  const metric = demoState().metrics[0];
  for (const target of [0, -5, Infinity, NaN, 1e13]) {
    assert.throws(() => validateMetric({ name: "Reading", target, unit: "" }));
  }
  for (const value of [-1, Infinity, NaN, "", "abc", 1e13])
    assert.throws(() => record(metric, today(), value));
  assert.throws(() => record(metric, "2099-01-01", 10));
  assert.throws(() => record(metric, "invalid-date", 10));
  assert.throws(() => record(metric, "2026-02-31", 10));
  assert.equal(average([]), 0);
  assert.ok(
    !isValidState({
      version: 1,
      demo: true,
      metrics: [{ ...metric, color: 7 }],
    }),
  );
  assert.ok(
    !isValidState({ version: 1, demo: true, metrics: [metric, metric] }),
  );
});
