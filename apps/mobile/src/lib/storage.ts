import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
export const storage = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
};
// Auth tokens stay in the native keychain. Web uses an HttpOnly backend session cookie.
export const session = {
  getToken: () =>
    Platform.OS === "web"
      ? Promise.resolve(null)
      : SecureStore.getItemAsync("tadori.token"),
  setToken: async (token: string) => {
    if (Platform.OS !== "web")
      await SecureStore.setItemAsync("tadori.token", token);
  },
  clearToken: async () => {
    if (Platform.OS !== "web")
      await SecureStore.deleteItemAsync("tadori.token");
  },
};
/** Push Token の登録に使う、この端末 (このインストール) に固定の ID */
export async function getDeviceId(): Promise<string> {
  const key = "tadori.deviceId";
  const saved = await AsyncStorage.getItem(key);
  if (saved) return saved;
  const id = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(key, id);
  return id;
}
export const devicePlatform = () =>
  Platform.OS === "ios" ? ("IOS" as const) : ("ANDROID" as const);
