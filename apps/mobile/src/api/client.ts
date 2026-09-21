import { session } from "@/lib/storage";
export const apiUrl = process.env.EXPO_PUBLIC_API_URL;
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const token = await session.getToken();
    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      signal: controller.signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!response.ok)
      throw new Error(
        response.status === 401
          ? "ログインし直してください。"
          : "通信に失敗しました。時間をおいて再度お試しください。",
      );
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error("通信がタイムアウトしました。もう一度お試しください。");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
