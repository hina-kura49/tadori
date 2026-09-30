import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

// React Router のフレームワークモード。
// SSR (サーバーで HTML を作る) を有効にしているのは、共有リンク /r/:slug の HTML に
// ロードマップの中身と OGP タグ (SNS のリンクプレビュー) を入れるため。
// ほかの画面は今までどおり、ブラウザで TanStack Query がデータを取る。
export default {
  appDirectory: "src",
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config;
