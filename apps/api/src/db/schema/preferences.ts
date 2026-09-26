import { sql } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, timestamptz, updatedAt } from "./columns";
import { roadmapCategoryEnum } from "./enums";
import { roadmaps } from "./roadmaps";

// 表示上の好み。以前は mobile の端末内 (apps/mobile/src/api/localState.ts) にだけ持っていたが、
// Web 版や機種変更後の端末でも同じ状態を見られるように API へ移した。
// 行が無い User は「既定値」として扱う (user-preference.service.ts 参照)
//
// enableRLS: Supabase の Data API から直接読まれないよう、ほかのテーブルと同じく RLS を有効にする
// (apps/api/docs/supabase.md)。API は所有者ロールで接続するので影響を受けない
export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  interests: roadmapCategoryEnum("interests")
    .array()
    .notNull()
    .default(sql`'{}'`),
  // Today で大きく表示する Roadmap。Roadmap が消えたら未選択に戻す
  primaryRoadmapId: uuid("primary_roadmap_id").references(() => roadmaps.id, {
    onDelete: "set null",
  }),
  // Welcome と興味選択を終えた日時。null = まだ
  onboardedAt: timestamptz("onboarded_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS();
