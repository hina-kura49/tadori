/** API の置き場所 (サーバー側から直接呼ぶときに使う)。開発中は省略するとローカルの API */
export function apiOrigin(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.API_ORIGIN ?? (env.NODE_ENV === "production" ? undefined : "http://localhost:4000");
}
