import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { Loading } from "./components/ui";

// 画面は routes/ に 1 ファイルずつ置き、必要になったときに読み込む (lazy)。
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await load()).default,
});

export const router = createBrowserRouter([
  // ログイン不要
  { path: "/login", lazy: page(() => import("./routes/login")) },
  { path: "/r/:slug", lazy: page(() => import("./routes/public-roadmap")) },
  {
    element: <RequireAuth />,
    hydrateFallbackElement: <Loading />,
    children: [
      { path: "/onboarding", lazy: page(() => import("./routes/onboarding")) },
      {
        element: <AppLayout />,
        children: [
          { path: "/", lazy: page(() => import("./routes/today")) },
          { path: "/explore", lazy: page(() => import("./routes/explore")) },
          { path: "/roadmaps/new", lazy: page(() => import("./routes/roadmap-new")) },
          { path: "/roadmaps/:slug", lazy: page(() => import("./routes/roadmap-detail")) },
          { path: "/books/:id", lazy: page(() => import("./routes/book-detail")) },
          { path: "/circles", lazy: page(() => import("./routes/circles")) },
          { path: "/circles/new", lazy: page(() => import("./routes/circle-new")) },
          { path: "/circles/:id", lazy: page(() => import("./routes/circle-detail")) },
          { path: "/profile/:username", lazy: page(() => import("./routes/profile")) },
          { path: "/me", lazy: page(() => import("./routes/me")) },
          { path: "/settings", lazy: page(() => import("./routes/settings")) },
          { path: "*", lazy: page(() => import("./routes/not-found")) },
        ],
      },
    ],
  },
]);
