import { useState } from "react";
import { demoState } from "../model";
import { loadDashboard, saveDashboard, type LoadedDashboard } from "../storage";
import type { DashboardState } from "../types";

export function useDashboard() {
  const [loaded, setLoaded] = useState<LoadedDashboard>(() => {
    // Accessing localStorage itself can throw when storage is blocked.
    try {
      return loadDashboard(window.localStorage);
    } catch {
      return { state: demoState(), storageError: true };
    }
  });
  function save(next: DashboardState) {
    try {
      saveDashboard(window.localStorage, next);
    } catch {
      throw new Error(
        "保存できませんでした。ブラウザの保存設定・空き容量を確認してください。",
      );
    }
    setLoaded({ state: next, storageError: false });
  }
  return { ...loaded, save };
}
