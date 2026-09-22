import { session } from "@/lib/storage";
export const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
const configuredTimeout = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS);
const requestTimeoutMs =
  Number.isFinite(configuredTimeout) && configuredTimeout >= 1000 && configuredTimeout <= 120000
    ? configuredTimeout
    : 12000;

/** API が返したエラー。`code` は apps/api/src/lib/errors.ts の ERROR_CODES */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export const isAuthError = (error: unknown) =>
  error instanceof ApiError && error.status === 401;

// 画面に出す文言。ここに無い code は status から決める
const messages: Record<string, string> = {
  USERNAME_TAKEN: "このUsernameはすでに使われています。",
  ROADMAP_NOT_FOUND: "Roadmapが見つかりません。",
  ROADMAP_HAS_NO_STEPS: "このRoadmapにはまだ本がありません。",
  BOOK_ALREADY_EXISTS: "同じISBNの本がすでに登録されています。",
  CIRCLE_NOT_FOUND: "Circleが見つかりません。",
  CIRCLE_FULL: "このCircleは満員です。",
  CIRCLE_INVITE_REQUIRED: "参加するには招待が必要です。",
  CIRCLE_INVALID_TARGET: "非公開のRoadmapは公開Circleの対象にできません。",
  FORBIDDEN: "この操作を行う権限がありません。",
  VALIDATION_ERROR: "入力内容を確認してください。",
  INVALID_EMAIL_OR_PASSWORD: "メールアドレスまたはパスワードが違います。",
  USER_ALREADY_EXISTS: "このメールアドレスはすでに登録されています。",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "このメールアドレスはすでに登録されています。",
  PASSWORD_TOO_SHORT: "パスワードは8文字以上にしてください。",
  INVALID_EMAIL: "メールアドレスの形式が正しくありません。",
};
function messageFor(status: number, code: string) {
  if (messages[code]) return messages[code];
  if (status === 401) return "ログインし直してください。";
  return "通信に失敗しました。時間をおいて再度お試しください。";
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
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
    if (!response.ok) {
      // API のエラーは常に { code, message } (apps/api/README.md の Error Response)
      const body = (await response.json().catch(() => null)) as {
        code?: string;
      } | null;
      const code = body?.code ?? "UNKNOWN";
      // token が無効になっていたら捨てる。次の画面遷移でログイン画面へ戻る
      if (response.status === 401 && token) await session.clearToken();
      throw new ApiError(
        response.status,
        code,
        messageFor(response.status, code),
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error("通信がタイムアウトしました。もう一度お試しください。");
    if (error instanceof TypeError)
      throw new Error(
        "サーバーに接続できません。ネットワークを確認してください。",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
