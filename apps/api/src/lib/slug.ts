import { randomBytes } from "node:crypto";

/**
 * Roadmap の slug を作る。
 * 日本語タイトルは ASCII 部分が残らないため "roadmap" にフォールバックし、
 * 末尾のランダム文字列で一意性を確保する (最終的な保証は DB の UNIQUE 制約)。
 */
export function generateSlug(title: string): string {
  const base = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

  const suffix = randomBytes(4).toString("hex");
  return `${base.length > 0 ? base : "roadmap"}-${suffix}`;
}
