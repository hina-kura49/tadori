import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";
import { AppError } from "./errors";

/**
 * Route で使う Zod バリデータ。
 * 失敗時は統一形式 (VALIDATION_ERROR) の AppError を throw する。
 *
 *   .post("/", requireAuth, validate("json", createBookSchema), (c) => {
 *     const body = c.req.valid("json");
 *   })
 */
export const validate = <Target extends keyof ValidationTargets, Schema extends ZodType>(
  target: Target,
  schema: Schema,
) =>
  zValidator(target, schema, (result) => {
    if (result.success) return;
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `Invalid request ${target}`,
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  });
