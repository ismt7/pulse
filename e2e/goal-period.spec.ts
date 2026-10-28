import { expect, test } from "@playwright/test";

test("a monthly goal limits records to its month and keeps the final result after the period", async ({
  page,
}) => {
  await page.goto("/");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /自分の目標ではじめる/ }).click();
  await page.getByLabel("目標の名前").fill("1月の売上");
  await page.getByLabel("目標値", { exact: true }).fill("100");
  await page.getByLabel("単位", { exact: true }).fill("万円");
  await page.getByLabel("月次").check();
  await page.getByLabel("対象月").fill("2025-01");
  await page.getByLabel("日ごとの増分").check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "目標を追加" })
    .click();
  await expect(page.locator(".metric-card .period-label")).toHaveText(
    "2025年1月",
  );
  await expect(page.locator(".metric-card .badge")).toHaveText("期間終了");

  await page.getByRole("button", { name: "実績を記録" }).click();
  const date = page.getByLabel("記録する日付");
  await expect(date).toHaveAttribute("min", "2025-01-01");
  await expect(date).toHaveAttribute("max", "2025-01-31");
  await expect(date).toHaveValue("2025-01-31");
  await date.fill("2025-01-10");
  await page.getByLabel(/その日の実績/).fill("30");
  await page.getByRole("button", { name: "実績を保存" }).click();
  await expect(page.locator(".metric-value")).toHaveText("30万円");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "30",
  );
  await page.reload();
  await expect(page.locator(".metric-value")).toHaveText("30万円");
});

test("a selected month is normalized to its calendar quarter", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "目標を追加", exact: true }).click();
  await page.getByLabel("目標の名前").fill("第2四半期の商談");
  await page.getByLabel("目標値", { exact: true }).fill("20");
  await page.getByLabel("四半期").check();
  await page.getByLabel("対象月").fill("2025-05");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "目標を追加" })
    .click();
  const card = page.locator(".metric-card", {
    has: page.getByRole("heading", { name: "第2四半期の商談", exact: true }),
  });
  await expect(card.locator(".period-label")).toHaveText("2025年 第2四半期");
  await card.getByRole("button", { name: "実績を記録" }).click();
  await expect(page.getByLabel("記録する日付")).toHaveAttribute(
    "min",
    "2025-04-01",
  );
  await expect(page.getByLabel("記録する日付")).toHaveAttribute(
    "max",
    "2025-06-30",
  );
});

test("future periods cannot be recorded and a period is locked after recording", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "目標を追加", exact: true }).click();
  await page.getByLabel("目標の名前").fill("未来の目標");
  await page.getByLabel("目標値", { exact: true }).fill("10");
  await page.getByLabel("月次").check();
  await page.getByLabel("対象月").fill("2090-01");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "目標を追加" })
    .click();
  const futureCard = page.locator(".metric-card", {
    has: page.getByRole("heading", { name: "未来の目標", exact: true }),
  });
  await expect(futureCard.locator(".badge")).toHaveText("開始前");
  await expect(
    futureCard.getByRole("button", { name: "期間開始後に記録" }),
  ).toBeDisabled();

  const pastCard = page.locator(".metric-card").first();
  await pastCard.getByRole("button", { name: /を編集/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "実績がある目標の期間は変更できません",
  );
});
