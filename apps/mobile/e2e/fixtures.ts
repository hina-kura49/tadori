import type { Page } from "@playwright/test";
import { createSeed } from "../src/api/seed";
import type { Category } from "../src/types/domain";
/** Existing user fixture. The actual new-user journey has its own end-to-end test. */
export async function existingUser(
  page: Page,
  name: string,
  username: string,
  category: Category,
) {
  const data = createSeed();
  data.profile = {
    ...data.profile,
    name,
    username,
    interests: [category],
    onboarded: true,
  };
  await page.addInitScript((db) => {
    if (!localStorage.getItem("tadori.database.v1"))
      localStorage.setItem("tadori.database.v1", JSON.stringify(db));
  }, data);
  await page.goto("/explore");
}
