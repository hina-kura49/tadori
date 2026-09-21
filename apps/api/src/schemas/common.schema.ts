import { z } from "zod";

// 複数の schema から使う小さな部品

/** 空文字を許さず、前後の空白を落とした文字列 */
export const trimmedString = (max: number) => z.string().trim().min(1).max(max);

/** 任意項目。null を送ると値を消せる */
export const nullableTrimmedString = (max: number) => trimmedString(max).nullable();

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, "username must be 3-30 characters of a-z, 0-9 or _");

export const dateOnlySchema = z.iso.date(); // "YYYY-MM-DD"

export const idParamSchema = z.object({ id: z.uuid() });
