import { z } from "zod";
import { categories } from "@/types/domain";
const required = (label: string) =>
  z.string().trim().min(1, `${label}を入力してください`);
export const stepSchema = z.object({
  id: z.string(),
  bookId: required("本"),
  why: required("選書理由"),
  checkpoint: required("Checkpoint").max(240),
  duration: required("目安期間"),
});
export const roadmapSchema = z.object({
  title: required("タイトル").max(100),
  description: required("説明").max(600),
  category: z.enum(categories),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  duration: required("目安期間"),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]),
  steps: z.array(stepSchema).min(1, "本とCheckpointを一つ以上追加してください"),
});
export type RoadmapForm = z.infer<typeof roadmapSchema>;
export const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const circleSchema = z
  .object({
    name: required("Circle名").max(80),
    targetType: z.enum(["Book", "Roadmap"]),
    targetId: required("対象"),
    visibility: z.enum(["PUBLIC", "INVITE_ONLY"]),
    startDate: z
      .string()
      .refine(validDate, "YYYY-MM-DD形式の有効な日付を入力してください"),
    endDate: z
      .string()
      .refine(validDate, "YYYY-MM-DD形式の有効な日付を入力してください"),
    meeting: z
      .string()
      .refine(
        (v) =>
          !v ||
          (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) &&
            !Number.isNaN(Date.parse(v))),
        "例：2026-10-01T20:00",
      ),
    maxMembers: z
      .number()
      .int()
      .min(2, "2人以上で設定してください")
      .max(30, "30人以下で設定してください"),
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "終了日は開始日以降にしてください",
  })
  .refine(
    (v) =>
      !v.meeting ||
      (v.meeting.slice(0, 10) >= v.startDate &&
        v.meeting.slice(0, 10) <= v.endDate),
    {
      path: ["meeting"],
      message: "ミーティングは活動期間内に設定してください",
    },
  );
export const reminderSchema = z
  .object({
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm形式で入力してください"),
    weekdays: z.array(z.number().int().min(1).max(7)),
    study: z.boolean(),
  })
  .refine((v) => !v.study || v.weekdays.length > 0, {
    path: ["weekdays"],
    message: "通知する曜日を選んでください",
  });
