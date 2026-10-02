import * as Linking from "expo-linking";

export const APP_SCHEME = "readtree";
/** Web 版の URL (例: https://readtree.vercel.app)。未設定なら共有リンクはアプリを開くリンクになる */
const webUrl = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/+$/, "");

export function notificationPath(value: unknown, web = webUrl): string | null {
  if (typeof value !== "string") return null;
  let path = value;
  if (value.startsWith(`${APP_SCHEME}://`)) path = "/" + value.slice(APP_SCHEME.length + 3);
  else if (web && value.startsWith(`${web}/`)) path = value.slice(web.length);
  return /^\/(roadmaps|circles|profile|r)\/[a-zA-Z0-9_-]+$/.test(path)
    ? path
    : null;
}
export const shareUrl = (kind: "r" | "profile" | "circles", id: string, web = webUrl) =>
  web ? `${web}/${kind}/${encodeURIComponent(id)}` : nativeUrl(`${kind}/${encodeURIComponent(id)}`);
export const nativeUrl = (path: string) =>
  Linking.createURL(path, { scheme: APP_SCHEME });
