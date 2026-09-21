import { timestamp, uuid } from "drizzle-orm/pg-core";

// precision: 3 (ミリ秒) にしているのは Cursor Pagination のため。
// JS の Date はミリ秒精度なので、DB 側がマイクロ秒だと
// cursor の (createdAt, id) 比較で行の取りこぼしが起きる。
export const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, precision: 3, mode: "date" });

export const id = () => uuid("id").primaryKey().defaultRandom();

export const createdAt = () => timestamptz("created_at").notNull().defaultNow();

export const updatedAt = () =>
  timestamptz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
