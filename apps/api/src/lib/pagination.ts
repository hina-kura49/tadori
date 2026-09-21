import { z } from "zod";
import { AppError } from "./errors";

// Cursor Pagination (keyset)。
// 一覧はすべて (createdAt DESC, id DESC) で並べ、最後の行の (createdAt, id) を
// base64url(JSON) にしたものを cursor として返す。
// cursor はクライアントにとって不透明な文字列であり、内容は検証してから使う。

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;

export type Cursor = { createdAt: Date; id: string };

export type Page<T> = { items: T[]; nextCursor: string | null };

const cursorPayloadSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

export function encodeCursor(cursor: Cursor): string {
  const payload = { createdAt: cursor.createdAt.toISOString(), id: cursor.id };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor(raw: string): Cursor {
  try {
    const json: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    const payload = cursorPayloadSchema.parse(json);
    return { createdAt: new Date(payload.createdAt), id: payload.id };
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid cursor");
  }
}

/**
 * Repository には `limit + 1` 件取得させ、その結果をここへ渡す。
 * 1 件多く取れていれば次ページあり。
 */
export function buildPage<Row extends { id: string; createdAt: Date }>(
  rows: Row[],
  limit: number,
): Page<Row> {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  const hasMore = rows.length > limit;
  return { items, nextCursor: hasMore && last ? encodeCursor(last) : null };
}

/** 一覧 API の query に共通で混ぜる Zod shape */
export const paginationQueryShape = {
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
  cursor: z.string().min(1).max(500).optional(),
};
