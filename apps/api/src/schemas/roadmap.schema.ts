import { z } from "zod";
import { ROADMAP_CATEGORIES, ROADMAP_DIFFICULTIES, ROADMAP_VISIBILITIES } from "../db/schema";
import { paginationQueryShape } from "../lib/pagination";
import { nullableTrimmedString, trimmedString, usernameSchema } from "./common.schema";

const estimatedDaysSchema = z.number().int().min(1).max(3650).nullable();

export const listRoadmapsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  category: z.enum(ROADMAP_CATEGORIES).optional(),
  difficulty: z.enum(ROADMAP_DIFFICULTIES).optional(),
  /** creator の username */
  creator: usernameSchema.optional(),
  ...paginationQueryShape,
});

export const roadmapSlugParamSchema = z.object({ slug: z.string().min(1).max(100) });

export const createRoadmapSchema = z.object({
  title: trimmedString(120),
  description: nullableTrimmedString(2000).optional(),
  category: z.enum(ROADMAP_CATEGORIES),
  difficulty: z.enum(ROADMAP_DIFFICULTIES),
  estimatedDays: estimatedDaysSchema.optional(),
  visibility: z.enum(ROADMAP_VISIBILITIES).default("PRIVATE"),
});

export const updateRoadmapSchema = z
  .object({
    title: trimmedString(120),
    description: nullableTrimmedString(2000),
    category: z.enum(ROADMAP_CATEGORIES),
    difficulty: z.enum(ROADMAP_DIFFICULTIES),
    estimatedDays: estimatedDaysSchema,
    visibility: z.enum(ROADMAP_VISIBILITIES),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const stepParamSchema = z.object({ id: z.uuid(), stepId: z.uuid() });

export const createStepSchema = z.object({
  bookId: z.uuid(),
  checkpoint: trimmedString(500),
  description: nullableTrimmedString(2000).optional(),
  estimatedDays: estimatedDaysSchema.optional(),
});

export const updateStepSchema = z
  .object({
    bookId: z.uuid(),
    checkpoint: trimmedString(500),
    description: nullableTrimmedString(2000),
    estimatedDays: estimatedDaysSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const reorderStepsSchema = z.object({
  steps: z
    .array(z.object({ stepId: z.uuid(), position: z.number().int().min(1) }))
    .min(1)
    .max(200),
});

export type ListRoadmapsQuery = z.infer<typeof listRoadmapsQuerySchema>;
export type CreateRoadmapInput = z.infer<typeof createRoadmapSchema>;
export type UpdateRoadmapInput = z.infer<typeof updateRoadmapSchema>;
export type CreateStepInput = z.infer<typeof createStepSchema>;
export type UpdateStepInput = z.infer<typeof updateStepSchema>;
export type ReorderStepsInput = z.infer<typeof reorderStepsSchema>;
