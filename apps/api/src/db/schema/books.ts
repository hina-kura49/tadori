import { date, index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./columns";

// 外部 Book API (Google Books / openBD など) には依存しない。
// 取り込み元を記録したい場合だけ externalSource / externalId を使う。
export const books = pgTable(
  "books",
  {
    id: id(),
    isbn13: text("isbn13").unique(), // nullable unique: NULL は重複可
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    author: text("author").notNull(),
    publisher: text("publisher"),
    coverImageUrl: text("cover_image_url"),
    description: text("description"),
    publishedAt: date("published_at", { mode: "string" }), // "YYYY-MM-DD"
    externalSource: text("external_source"),
    externalId: text("external_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("books_created_at_id_idx").on(table.createdAt, table.id)],
);
