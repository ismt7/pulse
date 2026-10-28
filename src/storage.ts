import { demoState, isValidState, normalizeState, STORAGE_KEY } from "./model";
import type { DashboardState } from "./types";

export interface LoadedDashboard {
  state: DashboardState;
  storageError: boolean;
}

export function loadDashboard(
  storage: Pick<Storage, "getItem">,
): LoadedDashboard {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    const state: unknown = saved === null ? demoState() : JSON.parse(saved);
    if (!isValidState(state)) throw new Error("Invalid saved dashboard");
    return { state: normalizeState(state), storageError: false };
  } catch {
    return { state: demoState(), storageError: true };
  }
}

export function saveDashboard(
  storage: Pick<Storage, "setItem">,
  state: DashboardState,
): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error(
      "保存できませんでした。ブラウザの保存設定・空き容量を確認してください。",
    );
  }
}
