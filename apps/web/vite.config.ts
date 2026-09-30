import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// /_api/* の中継は src/routes/api-proxy.ts (React Router のリソースルート) が行う。
// 開発中も本番 (Vercel) も同じコードが動く。
export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  server: { port: 5173 },
});
