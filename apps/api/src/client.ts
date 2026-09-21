import { hc } from "hono/client";
import type { BooksRoutes } from "./routes/books";
import type { CirclesRoutes } from "./routes/circles";
import type { MeRoutes } from "./routes/me";
import type { RoadmapsRoutes } from "./routes/roadmaps";
import type { UsersRoutes } from "./routes/users";

// React Native (Expo) から使う Hono RPC クライアント。
//
// AppType 全体から 1 つの巨大な client を作ると TypeScript の型推論が重くなるため、
// route 単位の小さな client に分割している。route を追加したらここにも 1 行足す。
//
//   const api = createApiClient("https://api.example.com", { headers: ... });
//   const res = await api.roadmaps.index.$get({ query: { category: "ENGINEERING" } });
//   const { items, nextCursor } = await res.json();

type ClientOptions = Parameters<typeof hc>[1];

export function createApiClient(baseUrl: string, options?: ClientOptions) {
  const base = baseUrl.replace(/\/+$/, "");
  return {
    users: hc<UsersRoutes>(`${base}/users`, options),
    books: hc<BooksRoutes>(`${base}/books`, options),
    roadmaps: hc<RoadmapsRoutes>(`${base}/roadmaps`, options),
    me: hc<MeRoutes>(`${base}/me`, options),
    circles: hc<CirclesRoutes>(`${base}/circles`, options),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

// Request / Response の型 (画面側で props の型などに使う)
export type { ErrorCode, ErrorResponseBody } from "./lib/errors";
export type { Page } from "./lib/pagination";
export type * from "./dto/book.dto";
export type * from "./dto/circle.dto";
export type * from "./dto/dashboard.dto";
export type * from "./dto/my-roadmap.dto";
export type * from "./dto/notification.dto";
export type * from "./dto/profile.dto";
export type * from "./dto/roadmap.dto";
export type * from "./dto/user.dto";
export type * from "./schemas/book.schema";
export type * from "./schemas/circle.schema";
export type * from "./schemas/me.schema";
export type * from "./schemas/progress.schema";
export type * from "./schemas/roadmap.schema";
