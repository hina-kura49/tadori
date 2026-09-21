import { randomBytes } from "node:crypto";

/**
 * Apple / Google ログインでは username を受け取れないので、仮の username を自動採番する。
 * 例: "user_3f9a1c07b2"。一意性の最終保証は DB の UNIQUE 制約。
 */
export function generateProvisionalUsername(): string {
  return `user_${randomBytes(5).toString("hex")}`;
}
