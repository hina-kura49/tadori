import { existingUser } from "./fixtures";
import { test, expect } from "@playwright/test";
test("start a path, update progress, finish, and restore after reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await existingUser(page, "Hinata", "hinata", "Engineering");
  await page
    .getByRole("button", {
      name: "Backend Engineering Foundations",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Start Roadmap", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start Reading", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Update Progress", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Update Progress", exact: true })
    .click();
  await page.getByRole("textbox", { name: "進捗（%）" }).fill("42");
  await page.getByRole("button", { name: "進捗を保存", exact: true }).click();
  await expect(
    page.getByText("進捗を保存しました。今日も一歩、前へ。"),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("42%", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Checkpointに到達 · Complete" })
    .click();
  await expect(page.getByText("このCheckpointに到達しました。")).toBeVisible();
  await page.getByRole("button", { name: "次の一冊を確認する" }).click();
  await expect(page.getByText("●  YOU ARE HERE")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("1 / 4 books completed")).toBeVisible();
  await expect(
    page.getByText("達人に学ぶDB設計 徹底指南書", { exact: true }).last(),
  ).toBeVisible();
  await page.screenshot({
    path: "../../artifacts/today-mobile.png",
    fullPage: true,
  });
  await page.goto("/roadmaps/backend-engineering");
  await page.screenshot({
    path: "../../artifacts/roadmap-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("create a roadmap with checkpoints, reorder books, and create a circle", async ({
  page,
}) => {
  await existingUser(page, "Yuki", "yuki_test", "Product");
  await page.goto("/roadmaps/new");
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("My learning path");
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("HTTPからDB設計へ");
  await page
    .getByRole("textbox", { name: "Estimated Duration", exact: true })
    .fill("1 month");
  await page.getByRole("button", { name: "本を追加する", exact: true }).click();
  await page
    .getByRole("button", { name: "Webを支える技術を追加", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Why this book?", exact: true })
    .fill("HTTPの基礎を理解する");
  await page
    .getByRole("textbox", { name: "Checkpoint *", exact: true })
    .fill("HTTPを説明できる");
  await page
    .getByRole("textbox", { name: "Step Duration", exact: true })
    .fill("1 week");
  await page.getByRole("button", { name: "本を追加する", exact: true }).click();
  await page
    .getByRole("button", { name: "SQLアンチパターンを追加", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Why this book?", exact: true })
    .nth(1)
    .fill("設計の失敗を知る");
  await page
    .getByRole("textbox", { name: "Checkpoint *", exact: true })
    .nth(1)
    .fill("SQLの失敗を説明できる");
  await page
    .getByRole("textbox", { name: "Step Duration", exact: true })
    .nth(1)
    .fill("1 week");
  await page
    .getByRole("button", { name: "SQLアンチパターンを上へ", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Checkpoint *", exact: true }).first(),
  ).toHaveValue("SQLの失敗を説明できる");
  await page
    .getByRole("button", { name: "Roadmapを保存する", exact: true })
    .click();
  await expect(
    page.getByText("My learning path", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("HTTPを説明できる", { exact: true }),
  ).toBeVisible();
  await page.goto("/circles/new");
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Test Circle");
  await page
    .getByRole("textbox", { name: "Start Date", exact: true })
    .fill("2026-10-01");
  await page
    .getByRole("textbox", { name: "Target End Date", exact: true })
    .fill("2026-11-01");
  await page
    .getByRole("button", { name: "Circleをつくる", exact: true })
    .click();
  await expect(page.getByText("Test Circle", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "参加しています", exact: true }),
  ).toBeDisabled();
});

test("onboarding explains invalid usernames and the primary action has a visible touch target", async ({
  page,
}) => {
  await existingUser(page, "Learner", "learner_test", "Engineering");
  await page.evaluate(() =>
    localStorage.setItem(
      "tadori.journey.v1",
      JSON.stringify({ stage: "me", needsName: true, needsUsername: true }),
    ),
  );
  await page.goto("/me");
  const button = page.getByRole("button", { name: "Continue to Today" });
  await expect(button).toHaveCSS("background-color", "rgb(35, 78, 73)");
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("蔵品日向");
  await page
    .getByRole("textbox", { name: "Username", exact: true })
    .fill("くら");
  await button.click();
  await expect(
    page.getByText("3文字以上で入力してください", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Username", exact: true })
    .fill("kurashina");
  await button.click();
  await expect(
    page.getByRole("button", { name: "最初のRoadmapを選ぶ", exact: true }),
  ).toBeVisible();
});

test("user registers a book with their own image; external covers are never requested", async ({
  page,
}) => {
  const imageRequests: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "image") imageRequests.push(r.url());
  });
  await existingUser(page, "Reader", "reader", "Design");
  await page.goto("/roadmaps/new");
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("My own books");
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("自分で登録した一冊で学ぶ");
  await page
    .getByRole("textbox", { name: "Estimated Duration", exact: true })
    .fill("2 weeks");
  await page.getByRole("button", { name: "本を追加する", exact: true }).click();
  await page
    .getByRole("button", { name: "新しい本を登録する", exact: true })
    .click();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "画像を選択（任意）", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "my-cover.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHHoAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByLabel("選択した表紙")).toBeVisible();
  await page
    .getByRole("textbox", { name: "本のタイトル", exact: true })
    .fill("私が登録した本");
  await page.getByRole("textbox", { name: "著者", exact: true }).fill("著者名");
  await page
    .getByRole("button", { name: "この本を登録する", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Why this book?", exact: true })
    .fill("学習の土台をつくる");
  await page
    .getByRole("textbox", { name: "Checkpoint *", exact: true })
    .fill("基本概念を説明できる");
  await page
    .getByRole("textbox", { name: "Step Duration", exact: true })
    .fill("2 weeks");
  await page
    .getByRole("button", { name: "Roadmapを保存する", exact: true })
    .click();
  await expect(page.getByLabel("登録した画像：私が登録した本")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("登録した画像：私が登録した本")).toBeVisible();
  expect(
    imageRequests.filter(
      (url) => url.startsWith("http") && !url.includes("127.0.0.1"),
    ),
  ).toEqual([]);
});
