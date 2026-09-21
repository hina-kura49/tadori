import * as Linking from "expo-linking";
export function notificationPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let path = value;
  if (value.startsWith("tadori://")) path = "/" + value.slice(9);
  else if (value.startsWith("https://tadori.app/")) path = value.slice(18);
  return /^\/(roadmaps|circles|profile|r)\/[a-zA-Z0-9_-]+$/.test(path)
    ? path
    : null;
}
export const shareUrl = (kind: "r" | "profile" | "circles", id: string) =>
  `https://tadori.app/${kind}/${encodeURIComponent(id)}`;
export const nativeUrl = (path: string) =>
  Linking.createURL(path, { scheme: "tadori" });
