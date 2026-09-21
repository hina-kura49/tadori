import { Category } from "@/types/domain";
import { storage } from "@/lib/storage";

// API に保存しない「この端末だけの状態」。ユーザーごとに分けて AsyncStorage に持つ。
// - interests / primaryRoadmapId: サーバーで使い道がない表示上の好み
// - weekdays / reminderRoadmapId: 学習リマインダーは端末が鳴らす Local Notification のため
// - avatarUri / bookCovers: 画像 upload API がまだ無いので、端末内のファイルを指す

export interface LocalState {
  /** Welcome と興味選択を終えたか。API には該当する項目が無い (interests と同じく端末内の状態) */
  onboarded?: boolean;
  interests: Category[];
  primaryRoadmapId?: string;
  weekdays: number[];
  reminderRoadmapId?: string;
  avatarUri?: string;
  bookCovers: Record<string, string>;
}

const defaults: LocalState = {
  interests: [],
  weekdays: [2, 3, 4, 5, 6], // 月〜金 (expo-notifications は 1 = 日曜)
  bookCovers: {},
};
const key = (userId: string) => `tadori.local.v1.${userId}`;

export async function readLocal(userId: string): Promise<LocalState> {
  const raw = await storage.get(key(userId));
  if (!raw) return { ...defaults };
  try {
    return { ...defaults, ...(JSON.parse(raw) as Partial<LocalState>) };
  } catch {
    return { ...defaults };
  }
}

export async function updateLocal(
  userId: string,
  change: (state: LocalState) => void,
): Promise<LocalState> {
  const state = await readLocal(userId);
  change(state);
  await storage.set(key(userId), JSON.stringify(state));
  return state;
}
