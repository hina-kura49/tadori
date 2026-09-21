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
};
