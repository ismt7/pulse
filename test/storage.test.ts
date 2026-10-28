import { describe, expect, test, vi } from "vitest";
import { loadDashboard, saveDashboard } from "../src/storage";
import { demoState, isValidState, STORAGE_KEY } from "../src/model";

describe("saved dashboards", () => {
  test("loads the original JavaScript version schema without changing the records", () => {
    const legacy = {
      version: 1,
      demo: false,
      metrics: [
        {
          id: "legacy",
          name: "既存の目標",
          target: 100,
          unit: "回",
          color: 2,
          entries: [{ date: "2025-01-01", value: 40 }],
        },
      ],
    };
    const getItem = vi.fn(() => JSON.stringify(legacy));
    const loaded = loadDashboard({ getItem });
    expect(getItem).toHaveBeenCalledWith("pulse.dashboard.v1");
    expect(loaded).toEqual({
      state: {
        ...legacy,
        metrics: [
          {
            ...legacy.metrics[0],
            recordingMode: "cumulative",
            direction: "increase",
            periodType: "all",
          },
        ],
      },
      storageError: false,
    });
  });

  test("falls back on broken or blocked storage without writing over it", () => {
    for (const saved of [
      "{bad",
      "null",
      '{"version":1,"demo":false,"metrics":[null]}',
    ]) {
      const storage = { getItem: () => saved, setItem: vi.fn() };
      const loaded = loadDashboard(storage);
      expect(loaded.storageError).toBe(true);
      expect(isValidState(loaded.state)).toBe(true);
      expect(storage.setItem).not.toHaveBeenCalled();
    }
    expect(
      loadDashboard({
        getItem() {
          throw new Error("Blocked");
        },
      }).storageError,
    ).toBe(true);
    expect(loadDashboard({ getItem: () => null }).storageError).toBe(false);
  });

  test("retains the key and surfaces quota failures", () => {
    const state = demoState();
    const setItem = vi.fn();
    saveDashboard({ setItem }, state);
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(state));
    expect(() =>
      saveDashboard(
        {
          setItem() {
            throw new Error("Quota exceeded");
          },
        },
        state,
      ),
    ).toThrow("保存できませんでした");
  });
});
