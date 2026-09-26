import { test, expect } from "@playwright/test";

test("welcome to a real roadmap, Today, optional Circle, and learning profile; resumes and stays completed", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByText("Learn by following", { exact: false }),
  ).toBeVisible();
  await page.screenshot({ path: "../../artifacts/onboarding-welcome.png" });
  await page
    .getByRole("button", { name: "Start your path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Find my first path" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Engineering", exact: true }).click();
  await page.getByRole("button", { name: "Product", exact: true }).click();
  await page.getByRole("button", { name: "Find my first path" }).click();
  await expect(
    page.getByText("Find your first path.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Backend Engineering Foundations",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Start this path", exact: true })
    .click();
  await expect(
    page.getByText("Your path has begun.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start Reading", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Today is your starting point.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "See Circle", exact: true }).click();
  await expect(
    page.getByText("Learn together.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("みんなの現在地", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Continue to Me", exact: true })
    .click();
  await expect(
    page.getByText("This becomes your learning profile.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("1 roadmaps in progress", { exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Hinata");
  await page
    .getByRole("textbox", { name: "Username", exact: true })
    .fill("hinata");
  await page
    .getByRole("button", { name: "Continue to Today", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start Reading", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Today is your starting point.", { exact: true }),
  ).toHaveCount(0);
  const db = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tadori.database.v1")!),
  );
  expect(db.enrollments).toHaveLength(1);
  expect(
    db.circles.every(
      (c: { members: string[] }) => !c.members.includes("Hinata"),
    ),
  ).toBe(true);
  expect(db.profile.username).toBe("hinata");
  expect(errors).toEqual([]);
});

test("no matching Circle can proceed directly to Me and unfinished tour resumes from root", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start your path" }).click();
  await page.getByRole("button", { name: "Business", exact: true }).click();
  await page.getByRole("button", { name: "Product", exact: true }).click();
  await page.getByRole("button", { name: "Find my first path" }).click();
  await page
    .getByRole("button", {
      name: "Start with the right questions",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Start this path" }).click();
  await expect(
    page.getByRole("button", { name: "See Circle", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "See my learning profile" }).click();
  await page.goto("/");
  await expect(
    page.getByText("This becomes your learning profile.", { exact: true }),
  ).toBeVisible();
});

test("a name entered at account registration is never requested again", async ({
  page,
}) => {
  const { createSeed } = await import("../src/api/seed");
  const d = createSeed();
  d.profile.name = "登録済みの名前";
  d.profile.username = "registered_user";
  d.profile.onboarded = false;
  await page.addInitScript((db) => {
    if (!localStorage.getItem("tadori.database.v1"))
      localStorage.setItem("tadori.database.v1", JSON.stringify(db));
  }, d);
  await page.goto("/");
  await page.getByRole("button", { name: "Start your path" }).click();
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Engineering", exact: true }).click();
  await page.getByRole("button", { name: "Business", exact: true }).click();
  await page.getByRole("button", { name: "Find my first path" }).click();
  await page
    .getByRole("button", {
      name: "Backend Engineering Foundations",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Start this path" }).click();
  await page.getByRole("button", { name: "Skip to Me" }).click();
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Username", exact: true })
    .fill("registered_user");
  await page.getByRole("button", { name: "Continue to Today" }).click();
  await expect(
    page.getByRole("button", { name: "Start Reading", exact: true }),
  ).toBeVisible();
  const name = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tadori.database.v1")!).profile.name,
  );
  expect(name).toBe("登録済みの名前");
});
