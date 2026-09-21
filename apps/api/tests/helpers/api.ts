import { app } from "../../src/app";
import { db } from "../../src/db/client";
import { books } from "../../src/db/schema";
import type { RoadmapDetailDto } from "../../src/dto/roadmap.dto";

export type TestUser = { id: string; name: string; username: string; cookie: string };

type RequestOptions = { as?: TestUser; json?: unknown; headers?: Record<string, string> };

/** app.request の薄いラッパー。`as` を渡すとそのユーザーの session cookie を付ける */
export async function api(method: string, path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = { ...options.headers };
  if (options.as) headers.cookie = options.as.cookie;
  if (options.json !== undefined) headers["content-type"] = "application/json";

  const response = await app.request(path, {
    method,
    headers,
    body: options.json === undefined ? undefined : JSON.stringify(options.json),
  });
  const text = await response.text();
  // biome-ignore lint/suspicious/noExplicitAny: テストでは body を自由に検証したい
  const body: any = text.length > 0 ? JSON.parse(text) : null;
  return { status: response.status, body, headers: response.headers };
}

/** Better Auth の signup を実際に通してユーザーを作る */
export async function createUser(username: string): Promise<TestUser> {
  const response = await api("POST", "/api/auth/sign-up/email", {
    json: {
      name: `${username} name`,
      email: `${username}@example.com`,
      password: "password-1234",
      username,
    },
  });
  if (response.status !== 200) {
    throw new Error(`signup failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  return { id: response.body.user.id, name: response.body.user.name, username, cookie };
}

export async function createBook(title: string) {
  const [book] = await db.insert(books).values({ title, author: "Test Author" }).returning();
  if (!book) throw new Error("createBook failed");
  return book;
}

/** API 経由で Roadmap と Step を作る。Step ごとに Book も作る */
export async function createRoadmap(
  creator: TestUser,
  options: { visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE"; stepCount?: number; title?: string } = {},
): Promise<RoadmapDetailDto> {
  const created = await api("POST", "/roadmaps", {
    as: creator,
    json: {
      title: options.title ?? "Test Roadmap",
      category: "ENGINEERING",
      difficulty: "BEGINNER",
      visibility: options.visibility ?? "PUBLIC",
    },
  });
  if (created.status !== 201) throw new Error(`createRoadmap failed: ${created.status}`);

  for (let index = 1; index <= (options.stepCount ?? 0); index++) {
    const book = await createBook(`Book ${index}`);
    const step = await api("POST", `/roadmaps/${created.body.id}/steps`, {
      as: creator,
      json: { bookId: book.id, checkpoint: `Checkpoint ${index}` },
    });
    if (step.status !== 201) throw new Error(`addStep failed: ${step.status}`);
  }

  const detail = await api("GET", `/roadmaps/${created.body.slug}`, { as: creator });
  return detail.body;
}

export async function registerDevice(user: TestUser, suffix: string) {
  return api("POST", "/me/devices", {
    as: user,
    json: {
      expoPushToken: `ExponentPushToken[${suffix}]`,
      platform: "IOS",
      deviceId: `device-${suffix}`,
    },
  });
}
