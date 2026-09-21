import { env } from "./env";

// Expo Push API を叩く唯一の場所。
// notification.service.ts だけがこれを使う。テストでは `expoPushClient.send` を mock する。

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default";
};

export type ExpoPushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

/** messages と同じ順序で ticket を返す。1 回の呼び出しは最大 100 件 (Expo の上限) */
async function send(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Expo Push API responded with ${response.status}`);
  }
  const json = (await response.json()) as { data: ExpoPushTicket[] };
  return json.data;
}

export const expoPushClient = { send };
