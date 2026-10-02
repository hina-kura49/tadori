import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import "./index.css";

export const links: Route.LinksFunction = () => [{ rel: "icon", type: "image/png", href: "/icon.png" }];

// 画面ごとの meta が無いときの既定。子の画面が meta を返すと、そちらに置き換わる
export const meta: Route.MetaFunction = () => [{ title: "Readtree" }];

/** すべての画面に共通の HTML の骨組み (サーバーでもブラウザでも使う) */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // サーバーではリクエストごとに作り直す (利用者どうしでキャッシュを共有しないため)
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

/** 画面の読み込みや描画に失敗したとき */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "予期しないエラーが起きました。時間をおいて再読み込みしてください。";
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="font-serif text-2xl">Readtree</p>
      <p className="mt-4 text-sm text-muted">{message}</p>
    </main>
  );
}
