import { expect, test } from "@playwright/test";

test("a decrease goal measures progress from its baseline to its lower target", async ({
  page,
}) => {
  await page.goto("/");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /自分の目標ではじめる/ }).click();
  await page.getByLabel("目標の名前").fill("体重");
  await page.getByLabel("目標値", { exact: true }).fill("70");
  await page.getByLabel("単位", { exact: true }).fill("kg");
  await page.getByLabel("数値を減らす").check();
  await page.getByLabel("開始値").fill("80");
  await expect(page.getByRole("dialog")).toContainText(
    "減らす目標では、その時点の現在値を記録します",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "目標を追加" })
    .click();

  await expect(page.locator(".metric-value")).toHaveText("80kg");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await expect(page.locator(".metric-card .mode-label")).toHaveText(
    "数値を減らす",
  );
  await page.getByRole("button", { name: "実績を記録" }).click();
  await expect(page.getByLabel(/その日までの累計実績/)).toHaveValue("80");
  await page.getByLabel("記録する日付").fill("2025-01-01");
  await page.getByLabel(/その日までの累計実績/).fill("75");
  await page.getByRole("button", { name: "実績を保存" }).click();
  await expect(page.locator(".metric-value")).toHaveText("75kg");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "50",
  );

  await page.getByRole("button", { name: "実績を記録" }).click();
  await page.getByLabel("記録する日付").fill("2025-01-02");
  await page.getByLabel(/その日までの累計実績/).fill("70");
  await page.getByRole("button", { name: "実績を保存" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expect(page.getByRole("status")).toContainText("目標達成");
  await page.reload();
  await expect(page.locator(".metric-value")).toHaveText("70kg");
});

test("invalid decrease settings stay in the form and recorded goal direction is locked", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "目標を追加", exact: true }).click();
  await page.getByLabel("目標の名前").fill("コスト");
  await page.getByLabel("目標値", { exact: true }).fill("50");
  await page.getByLabel("数値を減らす").check();
  await page.getByLabel("開始値").fill("40");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "目標を追加" })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "開始値は、目標値より大きく",
  );
  await page.getByLabel("開始値").fill("100");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "目標を追加" })
    .click();
  const card = page.locator(".metric-card", {
    has: page.getByRole("heading", { name: "コスト", exact: true }),
  });
  await card.getByRole("button", { name: "実績を記録" }).click();
  await page.getByLabel(/その日までの累計実績/).fill("90");
  await page.getByRole("button", { name: "実績を保存" }).click();
  await page.getByRole("button", { name: "コストを編集" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "実績がある目標の方向は変更できません",
  );
  await expect(page.getByLabel("数値を増やす")).toHaveCount(0);
});
