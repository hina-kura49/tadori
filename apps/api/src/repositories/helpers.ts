import { and, eq, lt, or, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { Cursor } from "../lib/pagination";

/**
 * (createdAt DESC, id DESC) で並べた一覧の「cursor より後ろ」を表す WHERE 条件。
 * cursor が無ければ undefined (= 条件なし) を返すので、そのまま and() に渡せる。
 */
export function afterCursor(
  createdAtColumn: PgColumn,
  idColumn: PgColumn,
  cursor: Cursor | undefined,
): SQL | undefined {
  if (!cursor) return undefined;
  return or(
    lt(createdAtColumn, cursor.createdAt),
    and(eq(createdAtColumn, cursor.createdAt), lt(idColumn, cursor.id)),
  );
}
