import { existingUser } from "./fixtures";
import { test, expect } from "@playwright/test";
test("photo persists on profile and share card and can be removed", async ({
  page,
}) => {
  await existingUser(page, "Hinata", "hinata", "Engineering");
  await expect(page.getByText("Curated paths")).toBeVisible();
  await page.goto("/me");
  await page
    .getByRole("button", { name: "プロフィールアイコンを変更" })
    .click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "写真から選ぶ" }).click();
  await (
    await chooser
  ).setFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHHoAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByLabel("Hinataのアイコン")).toBeVisible();
  await page.getByRole("button", { name: "保存する", exact: true }).click();
  await expect(page.getByRole("button", { name: "写真から選ぶ" })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(page.getByLabel("Hinataのアイコン")).toBeVisible();
  await page.goto("/profile/share");
  await expect(page.getByLabel("Hinataのアイコン")).toBeVisible();
  await page.goto("/me");
  await page
    .getByRole("button", { name: "プロフィールアイコンを変更" })
    .click();
  await page.getByRole("button", { name: "イニシャルに戻す" }).click();
  await page.getByRole("button", { name: "保存する", exact: true }).click();
  await expect(page.getByRole("button", { name: "写真から選ぶ" })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "プロフィールアイコンを変更" }),
  ).toBeVisible();
  await expect(page.getByLabel("Hinataのアイコン")).toHaveCount(0);
});
