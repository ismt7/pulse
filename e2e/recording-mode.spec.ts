import { expect, test } from "@playwright/test";

test("daily increments are summed, overwritten by date, edited and deleted", async ({
  page,
}) => {
  await page.goto("/");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /自分の目標ではじめる/ }).click();
  await page.getByLabel("目標の名前").fill("日々の売上");
  await page.getByLabel("目標値", { exact: true }).fill("100");
  await page.getByLabel("単位", { exact: true }).fill("万円");
  await page.getByLabel("日ごとの増分").check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "目標を追加" })
    .click();
  await expect(page.locator(".metric-card .mode-label")).toHaveText(
    "日ごとの増分",
  );

  await page.getByRole("button", { name: "実績を記録" }).click();
  await expect(page.getByLabel(/その日の実績/)).toHaveValue("0");
  await page.getByLabel("記録する日付").fill("2025-01-01");
  await page.getByLabel(/その日の実績/).fill("10");
  await page.getByRole("button", { name: "実績を保存" }).click();
  await page.getByRole("button", { name: "実績を記録" }).click();
  await page.getByLabel("記録する日付").fill("2025-01-02");
  await page.getByLabel(/その日の実績/).fill("20");
  await page.getByRole("button", { name: "実績を保存" }).click();
  await expect(page.locator(".metric-value")).toHaveText("30万円");

  await page.getByRole("button", { name: "日々の売上の詳細を見る" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("tbody tr").first()).toContainText("20 万円");
  await expect(dialog.locator("tbody tr").first()).toContainText("30 万円");
  await page.getByRole("button", { name: "2025-01-01の記録を修正" }).click();
  await page.getByLabel(/修正後のその日の実績/).fill("15");
  await page.getByRole("button", { name: "修正を保存" }).click();
  await expect(dialog.locator(".detail-summary")).toContainText("35");

  page.once("dialog", (confirmation) => confirmation.accept());
  await page.getByRole("button", { name: "2025-01-02の記録を削除" }).click();
  await expect(dialog.locator(".detail-summary")).toContainText("15");
  await page.keyboard.press("Escape");
  await expect(page.locator(".metric-value")).toHaveText("15万円");
  await page.reload();
  await expect(page.locator(".metric-value")).toHaveText("15万円");
});

test("existing cumulative data is migrated without changing totals and its mode is locked", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "pulse.dashboard.v1",
      JSON.stringify({
        version: 1,
        demo: false,
        metrics: [
          {
            id: "legacy",
            name: "従来の指標",
            target: 100,
            unit: "回",
            color: 0,
            entries: [
              { date: "2025-01-01", value: 10 },
              { date: "2025-01-02", value: 30 },
            ],
          },
        ],
      }),
    ),
  );
  await page.reload();
  await expect(page.locator(".metric-value")).toHaveText("30回");
  await expect(page.locator(".metric-card .mode-label")).toHaveText(
    "累計値・現在値",
  );
  await page.getByRole("button", { name: "従来の指標を編集" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "実績がある目標の記録方式は変更できません",
  );
  await expect(page.getByLabel("日ごとの増分")).toHaveCount(0);
  await page.getByRole("button", { name: "変更を保存" }).click();
  await page.reload();
  await expect(page.locator(".metric-value")).toHaveText("30回");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pulse.dashboard.v1")!),
  );
  expect(stored.metrics[0].recordingMode).toBe("cumulative");
});
