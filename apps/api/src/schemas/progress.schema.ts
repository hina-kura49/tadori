import { z } from "zod";
import { PROGRESS_TYPES, STEP_PROGRESS_STATUSES } from "../db/schema";

export const listMyRoadmapsQuerySchema = z.object({
  status: z.enum(["IN_PROGRESS", "PAUSED", "COMPLETED"]).optional(),
});

export const userRoadmapParamSchema = z.object({ userRoadmapId: z.uuid() });

export const userRoadmapStepParamSchema = z.object({
  userRoadmapId: z.uuid(),
  stepId: z.uuid(),
});

/** 一時停止と再開だけを受け付ける。COMPLETED は Step の完了から自動で決まる */
export const updateUserRoadmapSchema = z.object({
  status: z.enum(["IN_PROGRESS", "PAUSED"]),
});

/**
 * progressValue は progressType ごとに形式が決まる:
 *   NONE       -> null (省略可)
 *   PERCENTAGE -> "0" 〜 "100" の整数
 *   PAGE       -> 1 以上の整数
 *   CHAPTER    -> 自由文字列 (例: "Chapter 4")
 */
export const updateStepProgressSchema = z
  .object({
    status: z.enum(STEP_PROGRESS_STATUSES).optional(),
    progressType: z.enum(PROGRESS_TYPES).optional(),
    progressValue: z.string().trim().min(1).max(100).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const addIssue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (value.status === undefined && value.progressType === undefined) {
      addIssue("status", "status or progressType is required");
    }
    if (value.progressType === undefined) {
      if (value.progressValue !== undefined) {
        addIssue("progressType", "progressType is required when progressValue is given");
      }
      return;
    }

    const raw = value.progressValue ?? null;
    if (value.progressType === "NONE") {
      if (raw !== null) addIssue("progressValue", "progressValue must be null for NONE");
      return;
    }
    if (raw === null) {
      addIssue("progressValue", `progressValue is required for ${value.progressType}`);
      return;
    }
    if (value.progressType === "PERCENTAGE" && !(/^\d{1,3}$/.test(raw) && Number(raw) <= 100)) {
      addIssue("progressValue", "progressValue must be an integer between 0 and 100");
    }
    if (value.progressType === "PAGE" && !(/^\d{1,5}$/.test(raw) && Number(raw) >= 1)) {
      addIssue("progressValue", "progressValue must be a positive integer");
    }
  });

export type ListMyRoadmapsQuery = z.infer<typeof listMyRoadmapsQuerySchema>;
export type UpdateUserRoadmapInput = z.infer<typeof updateUserRoadmapSchema>;
export type UpdateStepProgressInput = z.infer<typeof updateStepProgressSchema>;
