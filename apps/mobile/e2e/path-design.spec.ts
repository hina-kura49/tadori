import { existingUser } from "./fixtures";
import { test, expect } from "@playwright/test";
test("each tab expresses a path; reading edits are explicit and sharing previews real data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await existingUser(page, "Hinata", "hinata", "Engineering");
  await expect(page.getByText("Curated paths")).toBeVisible();
  await page.screenshot({ path: "../../artifacts/explore-path.png" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "最初のRoadmapを選ぶ", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "../../artifacts/today-empty-path.png" });
  await page.goto("/create");
  await expect(
    page.getByRole("button", { name: "Roadmapをつくる" }),
  ).toBeVisible();
  await page.screenshot({ path: "../../artifacts/create-path.png" });
  await page.goto("/circles");
  await expect(page.getByText("3人がBook 2を進めています")).toBeVisible();
  await page.screenshot({ path: "../../artifacts/circles-path.png" });
  await page.goto("/books/mom?roadmapId=product&stepId=s-mom");
  await expect(page.getByText("Not started", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "進捗（%）" })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Roadmapを学習に追加", exact: true })
    .click();
  await page.screenshot({ path: "../../artifacts/reading-before.png" });
  await page
    .getByRole("button", { name: "Start Reading", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Update Progress", exact: true })
    .click();
  await page.getByRole("textbox", { name: "進捗（%）" }).fill("25");
  await page.getByRole("button", { name: "進捗を保存", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "進捗（%）" })).toHaveCount(0);
  await expect(page.getByText("25%", { exact: true })).toBeVisible();
  await page.screenshot({ path: "../../artifacts/reading-after.png" });
  await page.goto("/me");
  await expect(page.getByText("Your path", { exact: true })).toBeVisible();
  await page.screenshot({ path: "../../artifacts/me-path.png" });
  await page.getByRole("button", { name: "プロフィールを共有" }).click();
  await expect(page.getByText("学びの道を、持ち出そう。")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "テキストで共有", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("0 checkpoints · 0 paths completed"),
  ).toBeVisible();
  await page.screenshot({ path: "../../artifacts/share-path.png" });
  expect(errors).toEqual([]);
});
