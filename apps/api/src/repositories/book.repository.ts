import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db, type DbExecutor } from "../db/client";
import { books } from "../db/schema";
import { escapeLike } from "../lib/db-errors";
import type { Cursor } from "../lib/pagination";
import { afterCursor } from "./helpers";

export type BookRow = typeof books.$inferSelect;
export type NewBookRow = typeof books.$inferInsert;

export async function findBookById(id: string, executor: DbExecutor = db): Promise<BookRow | null> {
  const [row] = await executor.select().from(books).where(eq(books.id, id)).limit(1);
  return row ?? null;
}

/** title / author は部分一致、isbn13 は前方一致 (ハイフンは無視) */
export async function searchBooks(
  params: { q?: string; cursor?: Cursor; limit: number },
  executor: DbExecutor = db,
): Promise<BookRow[]> {
  const pattern = params.q ? `%${escapeLike(params.q)}%` : null;
  const isbnPattern = params.q ? `${escapeLike(params.q.replaceAll("-", ""))}%` : null;

  return executor
    .select()
    .from(books)
    .where(
      and(
        pattern && isbnPattern
          ? or(
              ilike(books.title, pattern),
              ilike(books.author, pattern),
              ilike(books.isbn13, isbnPattern),
            )
          : undefined,
        afterCursor(books.createdAt, books.id, params.cursor),
      ),
    )
    .orderBy(desc(books.createdAt), desc(books.id))
    .limit(params.limit);
}

export async function insertBook(values: NewBookRow, executor: DbExecutor = db): Promise<BookRow> {
  const [row] = await executor.insert(books).values(values).returning();
  if (!row) throw new Error("insertBook returned no row");
  return row;
}

export async function findBooksByIds(ids: string[], executor: DbExecutor = db): Promise<BookRow[]> {
  if (ids.length === 0) return [];
  return executor.select().from(books).where(inArray(books.id, ids));
}
