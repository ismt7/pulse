import { test, expect, type Page } from "@playwright/test";
import type { DashboardState } from "../src/types";

const original: DashboardState = {
  version: 1,
  demo: false,
  metrics: [
    {
      id: "old",
      name: "現在の目標",
      target: 100,
      unit: "回",
      color: 0,
      entries: [{ date: "2025-01-01", value: 20 }],
    },
  ],
};
const backup: DashboardState = {
  version: 1,
  demo: false,
  metrics: [
    {
      id: "restored",
      name: "復元した目標",
      target: 500,
      unit: "ページ",
      color: 2,
      entries: [
        { date: "2025-01-01", value: 10 },
        { date: "2025-01-02", value: 50 },
      ],
    },
  ],
};

const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("pulse.dashboard.v1")!));
const normalized = (state: DashboardState): DashboardState => ({
  ...state,
  metrics: state.metrics.map((metric) => ({
    ...metric,
    recordingMode: metric.recordingMode ?? "cumulative",
    direction: metric.direction ?? "increase",
    periodType: metric.periodType ?? "all",
  })),
});
async function choose(page: Page, data: unknown) {
  await page.getByLabel(/バックアップファイル/).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(
    (data) => localStorage.setItem("pulse.dashboard.v1", JSON.stringify(data)),
    original,
  );
  await page.reload();
});

test("preview requires explicit confirmation and restores data across a reload", async ({
  page,
}) => {
  await page.getByRole("button", { name: "データを読み込む" }).click();
  await choose(page, backup);
  const preview = page.getByRole("region", { name: "復元内容のプレビュー" });
  await expect(preview).toContainText("目標 1個 · 記録 2件");
  await expect(preview).toContainText("復元した目標");
  await expect(
    page.getByRole("button", { name: "この内容で復元" }),
  ).toBeDisabled();
  expect(await stored(page)).toEqual(original);
  await page.getByLabel("現在のデータを置き換えることを確認しました").check();
  await page.getByRole("button", { name: "この内容で復元" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".metric-value")).toHaveText("50ページ");
  expect(await stored(page)).toEqual(normalized(backup));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "復元した目標", exact: true }),
  ).toBeVisible();
});

test("canceling a preview preserves the existing data", async ({ page }) => {
  await page.getByRole("button", { name: "データを読み込む" }).click();
  await choose(page, backup);
  await expect(
    page.getByRole("region", { name: "復元内容のプレビュー" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "キャンセル" }).click();
  expect(await stored(page)).toEqual(original);
  await expect(
    page.getByRole("heading", { name: "現在の目標", exact: true }),
  ).toBeVisible();
});

test("a new invalid selection removes the previous preview and confirmation", async ({
  page,
}) => {
  await page.getByRole("button", { name: "データを読み込む" }).click();
  await choose(page, backup);
  await page.getByLabel("現在のデータを置き換えることを確認しました").check();
  for (const buffer of [
    Buffer.from("{broken"),
    Buffer.from(JSON.stringify({ ...backup, version: 2 })),
  ]) {
    await page.getByLabel(/バックアップファイル/).setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer,
    });
    await expect(
      page
        .getByRole("dialog")
        .getByRole("alert")
        .filter({ hasText: /JSON を読み取れません|対応していない/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "復元内容のプレビュー" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "この内容で復元" }),
    ).toBeDisabled();
    await expect(
      page.getByLabel("現在のデータを置き換えることを確認しました"),
    ).not.toBeChecked();
    expect(await stored(page)).toEqual(original);
  }
});

test("failed persistence leaves both the original data and the preview available", async ({
  page,
}) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "データを読み込む" }).click();
  await choose(page, backup);
  await page.getByLabel("現在のデータを置き換えることを確認しました").check();
  await page.getByRole("button", { name: "この内容で復元" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "保存できませんでした",
  );
  expect(await stored(page)).toEqual(original);
  await expect(
    page.getByRole("region", { name: "復元内容のプレビュー" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "キャンセル" }).click();
  await expect(page.locator(".metric-value")).toHaveText("20回");
});

test("an actual exported file can be restored on a mobile screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "データを書き出す" }).click();
  const download = await downloadPromise;
  await page.getByRole("button", { name: "データを読み込む" }).click();
  await page
    .getByLabel(/バックアップファイル/)
    .setInputFiles((await download.path())!);
  await expect(
    page.getByRole("region", { name: "復元内容のプレビュー" }),
  ).toContainText("現在の目標");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page.getByLabel("現在のデータを置き換えることを確認しました").check();
  await page.getByRole("button", { name: "この内容で復元" }).click();
  expect(await stored(page)).toEqual(normalized(original));
});
