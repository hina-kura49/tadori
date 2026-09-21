import { z } from "zod";
import { paginationQueryShape } from "../lib/pagination";
import { dateOnlySchema, nullableTrimmedString, trimmedString } from "./common.schema";

export const listBooksQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  ...paginationQueryShape,
});

export const createBookSchema = z.object({
  isbn13: z
    .string()
    .trim()
    .transform((value) => value.replaceAll("-", ""))
    .pipe(z.string().regex(/^97[89]\d{10}$/, "isbn13 must be a 13-digit ISBN"))
    .nullable()
    .optional(),
  title: trimmedString(300),
  subtitle: nullableTrimmedString(300).optional(),
  author: trimmedString(300),
  publisher: nullableTrimmedString(200).optional(),
  coverImageUrl: z.url().max(2000).nullable().optional(),
  description: nullableTrimmedString(5000).optional(),
  publishedAt: dateOnlySchema.nullable().optional(),
  externalSource: nullableTrimmedString(50).optional(),
  externalId: nullableTrimmedString(200).optional(),
});

export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;
export type CreateBookInput = z.infer<typeof createBookSchema>;
