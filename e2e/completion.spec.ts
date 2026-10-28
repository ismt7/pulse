import { expect, test } from "@playwright/test";

test("search and sorting narrow and reorder the dashboard", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByPlaceholder("目標を検索").fill("学び");
  await expect(page.locator(".metric-card")).toHaveCount(1);
  await expect(page.locator(".metric-card h3")).toHaveText("学びの時間");
  await page.getByPlaceholder("目標を検索").clear();
  await page.getByLabel("目標の並び順").selectOption("name");
  await expect(page.locator(".metric-card h3").first()).toHaveText(
    "アイデアをかたちに",
  );
  await page.getByLabel("目標の並び順").selectOption("progress");
  await expect(page.locator(".metric-card h3").first()).toHaveText(
    "学びの時間",
  );
});

test("custom periods enforce exact dates and duplicate to the following equal period", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "目標を追加", exact: true }).click();
  await page.getByLabel("目標の名前").fill("キャンペーン");
  await page.getByLabel("目標値", { exact: true }).fill("10");
  await page.getByLabel("任意").check();
  await page.getByLabel("開始日").fill("2025-01-10");
  await page.getByLabel("終了日").fill("2025-01-20");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "目標を追加" })
    .click();
  const card = page.locator(".metric-card", {
    has: page.getByRole("heading", { name: "キャンペーン", exact: true }),
  });
  await expect(card.locator(".period-label")).toHaveText(
    "2025/01/10〜2025/01/20",
  );
  await card.getByRole("button", { name: "実績を記録" }).click();
  await expect(page.getByLabel("記録する日付")).toHaveAttribute(
    "min",
    "2025-01-10",
  );
  await expect(page.getByLabel("記録する日付")).toHaveAttribute(
    "max",
    "2025-01-20",
  );
  await page.keyboard.press("Escape");
  await card.getByRole("button", { name: "キャンペーンの詳細を見る" }).click();
  await page.getByRole("button", { name: "次の期間へ複製" }).click();
  await expect(page.getByRole("status")).toContainText("次の期間の目標を作成");
  const cards = page.locator(".metric-card", {
    has: page.getByRole("heading", { name: "キャンペーン", exact: true }),
  });
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(1).locator(".period-label")).toHaveText(
    "2025/01/21〜2025/01/31",
  );
});

test("JSON and CSV downloads are both available and CSV contains calculated rows", async ({
  page,
}) => {
  await page.goto("/");
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSVを書き出す" }).click();
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toMatch(/^pulse-\d{4}-\d{2}-\d{2}\.csv$/);
  const stream = await csv.createReadStream();
  let text = "";
  for await (const chunk of stream) text += chunk;
  expect(text).toContain("その日時点の累計・現在値");
  expect(text).toContain("本を読む");
  const jsonPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "データを書き出す" }).click();
  expect((await jsonPromise).suggestedFilename()).toMatch(/\.json$/);
});
