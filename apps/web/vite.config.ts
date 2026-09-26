import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 開発中は /_api/* をローカルの API (apps/api) へ中継する。
// ブラウザから見ると同じオリジンになるので、ログイン用の Cookie がそのまま使える。
// 本番では Vercel Functions (api/proxy.ts) が同じ役割をする。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  server: {
    port: 5173,
    proxy: {
      "/_api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/_api/, ""),
      },
    },
  },
});
