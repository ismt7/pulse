import { test, expect } from "@playwright/test";

test("create, record, persist, edit, export and delete a personal goal", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".metric-card")).toHaveCount(4);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /自分の目標ではじめる/ }).click();
  await page.getByLabel("目標の名前").fill("OSSへの貢献");
  await page.getByLabel("目標値", { exact: true }).fill("5");
  await page.getByLabel("単位", { exact: true }).fill("PR");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "目標を追加" })
    .click();
  await expect(page.locator(".metric-card")).toHaveCount(1);
  await page.getByRole("button", { name: "実績を記録" }).click();
  await page.getByLabel(/その日までの累計実績/).fill("5");
  await page.getByRole("button", { name: "実績を保存" }).click();
  await expect(page.locator(".badge")).toContainText("目標達成");
  await expect(page.getByRole("status")).toContainText("目標達成");
  await page.reload();
  await expect(page.locator(".metric-value")).toHaveText("5PR");
  await expect(page.locator(".badge")).toContainText("目標達成");
  await page.getByRole("button", { name: "進行中", exact: true }).click();
  await expect(page.locator(".metric-card")).toHaveCount(0);
  await page.getByRole("button", { name: "達成済み", exact: true }).click();
  await expect(page.locator(".metric-card")).toHaveCount(1);
  await page.getByRole("button", { name: "OSSへの貢献を編集" }).click();
  await page.getByLabel("目標値", { exact: true }).fill("10");
  await page.getByRole("button", { name: "変更を保存" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "50",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "データを書き出す" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^pulse-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const stream = await download.createReadStream();
  let text = "";
  for await (const chunk of stream) text += chunk;
  const data = JSON.parse(text);
  expect(data.metrics[0].entries[0].value).toBe(5);
  expect(data.demo).toBe(false);
  await page.getByRole("button", { name: "OSSへの貢献を編集" }).click();
  await page.getByRole("button", { name: "目標を削除" }).click();
  await expect(page.locator(".metric-card")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".metric-card")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("mobile display fits the viewport and treats goal names as plain text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "目標を追加", exact: true }).click();
  await page.getByLabel("目標の名前").fill("<img src=x onerror=alert(1)>");
  await page.getByLabel("目標値", { exact: true }).fill("100");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "目標を追加" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "<img src=x onerror=alert(1)>",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.locator(".metric-card img").count()).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("グラフの表示期間").selectOption("30");
  await expect(page.getByRole("img", { name: /直近30日間/ })).toBeVisible();
});

test("unreadable saved data is preserved until an explicit write", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("pulse.dashboard.v1", "broken-data"),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("元のデータを上書きせず");
  expect(
    await page.evaluate(() => localStorage.getItem("pulse.dashboard.v1")),
  ).toBe("broken-data");
  await expect(page.locator(".metric-card")).toHaveCount(4);
});

test("pre-migration data survives editing and historical record updates", async ({
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
            name: "移行前の目標",
            unit: "ページ",
            target: 100,
            color: 0,
            entries: [
              { date: "2025-01-01", value: 10 },
              { date: "2025-01-03", value: 30 },
            ],
          },
        ],
      }),
    ),
  );
  await page.reload();
  await expect(page.locator(".metric-value")).toHaveText("30ページ");
  await page.getByRole("button", { name: "実績を記録" }).click();
  await page.getByLabel("記録する日付").fill("2025-01-01");
  await expect(page.getByLabel(/その日までの累計実績/)).toHaveValue("10");
  await page.getByLabel(/その日までの累計実績/).fill("15");
  await page.getByRole("button", { name: "実績を保存" }).click();
  await expect(page.locator(".metric-value")).toHaveText("30ページ");
  await page.getByRole("button", { name: "移行前の目標を編集" }).click();
  await page.getByLabel("目標の名前").fill("移行後の目標");
  await page.getByRole("button", { name: "変更を保存" }).click();
  await page.reload();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pulse.dashboard.v1")!),
  );
  expect(data.metrics[0].name).toBe("移行後の目標");
  expect(data.metrics[0].entries).toEqual([
    { date: "2025-01-01", value: 15 },
    { date: "2025-01-03", value: 30 },
  ]);
});

test("a failed save keeps the form open and does not update the displayed goal", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "目標を追加", exact: true }).click();
  await page.getByLabel("目標の名前").fill("保存できない目標");
  await page.getByLabel("目標値", { exact: true }).fill("10");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "目標を追加" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "保存できませんでした",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".metric-card")).toHaveCount(4);
});
