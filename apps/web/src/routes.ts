import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

// 画面は routes/ に 1 ファイルずつ置く。読み込みは画面ごとに自動で分割される。
export default [
  // API への中継 (画面ではない)
  route("_api/*", "routes/api-proxy.ts"),

  // ログイン不要
  route("login", "routes/login.tsx"),
  route("r/:slug", "routes/public-roadmap.tsx"),

  layout("routes/layout-auth.tsx", [
    route("onboarding", "routes/onboarding.tsx"),
    layout("routes/layout-app.tsx", [
      index("routes/today.tsx"),
      route("explore", "routes/explore.tsx"),
      route("roadmaps/new", "routes/roadmap-new.tsx"),
      route("roadmaps/:slug", "routes/roadmap-detail.tsx"),
      route("books/:id", "routes/book-detail.tsx"),
      route("circles", "routes/circles.tsx"),
      route("circles/new", "routes/circle-new.tsx"),
      route("circles/:id", "routes/circle-detail.tsx"),
      route("profile/:username", "routes/profile.tsx"),
      route("me", "routes/me.tsx"),
      route("settings", "routes/settings.tsx"),
      route("*", "routes/not-found.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
