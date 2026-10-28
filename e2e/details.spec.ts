import { test, expect, type Page } from "@playwright/test";
import type { DashboardState } from "../src/types";

const fixture: DashboardState = {
  version: 1,
  demo: false,
  metrics: [
    {
      id: "reading",
      name: "読書",
      target: 200,
      unit: "ページ",
      color: 0,
      entries: Array.from({ length: 12 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, "0")}`,
        value: (i + 1) * 10,
      })),
    },
  ],
};
async function seed(page: Page, data = fixture) {
  await page.goto("/");
  await page.evaluate(
    (data) => localStorage.setItem("pulse.dashboard.v1", JSON.stringify(data)),
    data,
  );
  await page.reload();
  await page.getByRole("button", { name: "読書の詳細を見る" }).click();
}
const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("pulse.dashboard.v1")!));

test("full history supports pagination and persistent corrections to past totals", async ({
  page,
}) => {
  await seed(page);
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("img", { name: "読書の全12件の記録日の累計実績グラフ" }),
  ).toBeVisible();
  await expect(dialog.locator("tbody tr")).toHaveCount(10);
  await page.getByRole("button", { name: "2025-01-12の記録を修正" }).click();
  await page.getByLabel(/修正後の累計実績/).fill("150");
  await page.getByRole("button", { name: "修正を保存" }).click();
  await expect(dialog.locator(".detail-summary")).toContainText("150");
  await page.getByRole("button", { name: "次へ", exact: true }).click();
  await expect(dialog.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "2025-01-01の記録を修正" }).click();
  await page.getByLabel(/修正後の累計実績/).fill("3");
  await page.getByRole("button", { name: "修正を保存" }).click();
  await expect(dialog.locator(".detail-summary")).toContainText("150");
  await page.keyboard.press("Escape");
  await expect(page.locator(".metric-value")).toHaveText("150ページ");
  await page.reload();
  const data = await stored(page);
  expect(data.metrics[0].entries[0].value).toBe(3);
  expect(data.metrics[0].entries.at(-1).value).toBe(150);
});

test("latest record deletion requires confirmation and restores the previous total", async ({
  page,
}) => {
  await seed(page);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "2025-01-12の記録を削除" }).click();
  expect((await stored(page)).metrics[0].entries).toHaveLength(12);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "2025-01-12の記録を削除" }).click();
  await expect(
    page.getByRole("dialog").locator(".detail-summary"),
  ).toContainText("110");
  await expect(
    page.getByRole("button", { name: "2025-01-12の記録を削除" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".metric-value")).toHaveText("110ページ");
});

test("empty mobile history supports recording and deleting the last entry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, {
    ...fixture,
    metrics: [{ ...fixture.metrics[0], entries: [] }],
  });
  await expect(page.getByRole("dialog")).toContainText("まだ記録がありません");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "実績を記録" })
    .click();
  await page.getByLabel("記録する日付").fill("2025-01-01");
  await page.getByLabel(/その日までの累計実績/).fill("25");
  await page.getByRole("button", { name: "実績を保存" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "読書", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "2025-01-01の記録を削除" }).click();
  await expect(page.getByRole("dialog")).toContainText("まだ記録がありません");
  expect((await stored(page)).metrics[0].entries).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator(".metric-value")).toHaveText("0ページ");
});

test("failed saves preserve the history and the pending correction", async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "2025-01-12の記録を修正" }).click();
  await page.getByLabel(/修正後の累計実績/).fill("150");
  await page.getByRole("button", { name: "修正を保存" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "保存できませんでした",
  );
  await expect(page.getByLabel(/修正後の累計実績/)).toHaveValue("150");
  expect(await stored(page)).toEqual(fixture);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "2025-01-12の記録を削除" }).click();
  expect(await stored(page)).toEqual(fixture);
});
