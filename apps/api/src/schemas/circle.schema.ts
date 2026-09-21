import { z } from "zod";
import { CIRCLE_TARGET_TYPES, CIRCLE_VISIBILITIES } from "../db/schema";
import { paginationQueryShape } from "../lib/pagination";
import {
  dateOnlySchema,
  nullableTrimmedString,
  trimmedString,
  usernameSchema,
} from "./common.schema";

const maxMembersSchema = z.number().int().min(2).max(100);

export const listCirclesQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  targetType: z.enum(CIRCLE_TARGET_TYPES).optional(),
  roadmapId: z.uuid().optional(),
  bookId: z.uuid().optional(),
  // 一覧に出るのは PUBLIC のみ。仕様上の query として受け取るが PUBLIC 以外は指定できない
  visibility: z.literal("PUBLIC").optional(),
  ...paginationQueryShape,
});

const circleBaseShape = {
  name: trimmedString(80),
  description: nullableTrimmedString(2000).optional(),
  visibility: z.enum(CIRCLE_VISIBILITIES).default("PUBLIC"),
  startDate: dateOnlySchema.nullable().optional(),
  targetEndDate: dateOnlySchema.nullable().optional(),
  maxMembers: maxMembersSchema.default(10),
};

/** targetType に応じて bookId / roadmapId のどちらかだけを必須にする */
export const createCircleSchema = z
  .discriminatedUnion("targetType", [
    z.object({ ...circleBaseShape, targetType: z.literal("BOOK"), bookId: z.uuid() }),
    z.object({ ...circleBaseShape, targetType: z.literal("ROADMAP"), roadmapId: z.uuid() }),
  ])
  .refine(
    (value) => !value.startDate || !value.targetEndDate || value.startDate <= value.targetEndDate,
    { path: ["targetEndDate"], message: "targetEndDate must be on or after startDate" },
  );

/** 対象 (Book / Roadmap) は作成後に変更できない */
export const updateCircleSchema = z
  .object({
    name: trimmedString(80),
    description: nullableTrimmedString(2000),
    visibility: z.enum(CIRCLE_VISIBILITIES),
    startDate: dateOnlySchema.nullable(),
    targetEndDate: dateOnlySchema.nullable(),
    maxMembers: maxMembersSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const inviteToCircleSchema = z.object({ username: usernameSchema });

export const scheduleParamSchema = z.object({ id: z.uuid(), scheduleId: z.uuid() });

export const createScheduleSchema = z.object({
  title: trimmedString(120),
  scheduledAt: z.iso.datetime({ offset: true }),
  description: nullableTrimmedString(2000).optional(),
});

export const updateScheduleSchema = z
  .object({
    title: trimmedString(120),
    scheduledAt: z.iso.datetime({ offset: true }),
    description: nullableTrimmedString(2000),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export type ListCirclesQuery = z.infer<typeof listCirclesQuerySchema>;
export type CreateCircleInput = z.infer<typeof createCircleSchema>;
export type UpdateCircleInput = z.infer<typeof updateCircleSchema>;
export type InviteToCircleInput = z.infer<typeof inviteToCircleSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
