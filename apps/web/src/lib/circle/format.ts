// サークル画面で使う表示用の小さな関数

export function meetingLabel(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString("ja-JP", {
        month: "short",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "日程調整中";
}

/** "2026-10-01" → "10月1日" */
export function dateLabel(value: string | null | undefined) {
  if (!value) return "未定";
  const [, m, d] = value.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

export function periodLabel(start: string | null, end: string | null) {
  if (!start && !end) return "期間は決めていません";
  return `${dateLabel(start)} → ${dateLabel(end)}`;
}

export const visibilityLabel = (v: "PUBLIC" | "INVITE_ONLY") => (v === "PUBLIC" ? "公開" : "招待制");
export const targetTypeLabel = (t: "BOOK" | "ROADMAP") => (t === "BOOK" ? "本" : "ロードマップ");

/** 予定のうち、これから来る最初のもの */
export function nextSchedule<T extends { scheduledAt: string }>(schedules: T[], now = Date.now()) {
  return schedules
    .filter((s) => new Date(s.scheduledAt).getTime() >= now)
    .toSorted((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
}

/** <input type="datetime-local"> の値 ("2026-10-01T20:00") をタイムゾーン付き ISO 文字列にする */
export function localDateTimeToIso(value: string) {
  return new Date(value).toISOString();
}
