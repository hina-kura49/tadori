import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { apiUrl } from "@/api/client";
import { session } from "./storage";
export async function selectBookImage(): Promise<string | undefined> {
  return selectImage([2, 3]);
}
export async function selectProfileImage(): Promise<string | undefined> {
  return selectImage([1, 1]);
}
async function selectImage(
  aspect: [number, number],
): Promise<string | undefined> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect,
    quality: 0.7,
    base64: Platform.OS === "web",
  });
  if (result.canceled) return;
  const asset = result.assets[0];
  if ((asset.fileSize ?? 0) > 3 * 1024 * 1024)
    throw new Error("3MB以下の画像を選択してください。");
  if (Platform.OS === "web") {
    if (!asset.base64)
      throw new Error(
        "画像を読み込めませんでした。別の画像を選択してください。",
      );
    if (asset.base64.length > 4 * 1024 * 1024)
      throw new Error("3MB以下の画像を選択してください。");
    return `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
  }
  return asset.uri;
}
export async function persistBookImage(uri: string): Promise<string> {
  return persistImage(uri, "book-cover", "book-covers");
}
export async function persistProfileImage(uri: string): Promise<string> {
  return persistImage(uri, "profile-avatar", "profile-avatars");
}
async function persistImage(
  uri: string,
  endpoint: string,
  directory: string,
): Promise<string> {
  if (apiUrl) {
    const form = new FormData();
    if (Platform.OS === "web")
      form.append("file", await (await fetch(uri)).blob(), "cover.jpg");
    else
      form.append("file", {
        uri,
        name: "cover.jpg",
        type: "image/jpeg",
      } as unknown as Blob);
    const token = await session.getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${apiUrl}/v1/uploads/${endpoint}`, {
        method: "POST",
        body: form,
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("画像の保存に失敗しました。");
      const data = (await response.json()) as { url: string };
      if (!data.url?.startsWith("https://"))
        throw new Error("画像の保存先が無効です。");
      return data.url;
    } finally {
      clearTimeout(timer);
    }
  }
  if (Platform.OS === "web") return uri;
  const folder = `${FileSystem.documentDirectory}${directory}/`;
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  const target = `${folder}${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}
