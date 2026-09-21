import { index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { books } from "./books";
import { createdAt, id, timestamptz, updatedAt } from "./columns";
import {
  progressTypeEnum,
  roadmapCategoryEnum,
  roadmapDifficultyEnum,
  roadmapVisibilityEnum,
  stepProgressStatusEnum,
  userRoadmapStatusEnum,
} from "./enums";

// onDelete の方針:
// - User 削除      -> その User の Roadmap / 学習状況は CASCADE で消える
// - Roadmap 削除   -> Step / 学習者の UserRoadmap も CASCADE で消える
// - Book 削除      -> Step から参照されている間は RESTRICT (Roadmap を壊さない)

export const roadmaps = pgTable(
  "roadmaps",
  {
    id: id(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    category: roadmapCategoryEnum("category").notNull(),
    difficulty: roadmapDifficultyEnum("difficulty").notNull(),
    estimatedDays: integer("estimated_days"),
    visibility: roadmapVisibilityEnum("visibility").notNull().default("PRIVATE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("roadmaps_creator_id_idx").on(table.creatorId),
    index("roadmaps_visibility_created_at_id_idx").on(table.visibility, table.createdAt, table.id),
  ],
);

export const roadmapSteps = pgTable(
  "roadmap_steps",
  {
    id: id(),
    roadmapId: uuid("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "restrict" }),
    // 1 始まり。並べ替え中だけ一時的に負の値を取る (roadmap.repository.ts 参照)
    position: integer("position").notNull(),
    description: text("description"),
    // 「この本をどこまで読めば何ができるようになるか」。Roadmap を単なる Book List にしないための必須項目
    checkpoint: text("checkpoint").notNull(),
    estimatedDays: integer("estimated_days"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("roadmap_steps_roadmap_id_position_unique").on(table.roadmapId, table.position),
    index("roadmap_steps_book_id_idx").on(table.bookId),
  ],
);

export const userRoadmaps = pgTable(
  "user_roadmaps",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roadmapId: uuid("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    status: userRoadmapStatusEnum("status").notNull().default("NOT_STARTED"),
    startedAt: timestamptz("started_at"),
    completedAt: timestamptz("completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("user_roadmaps_user_id_roadmap_id_unique").on(table.userId, table.roadmapId),
    index("user_roadmaps_roadmap_id_idx").on(table.roadmapId),
  ],
);

export const userRoadmapStepProgress = pgTable(
  "user_roadmap_step_progress",
  {
    id: id(),
    userRoadmapId: uuid("user_roadmap_id")
      .notNull()
      .references(() => userRoadmaps.id, { onDelete: "cascade" }),
    roadmapStepId: uuid("roadmap_step_id")
      .notNull()
      .references(() => roadmapSteps.id, { onDelete: "cascade" }),
    status: stepProgressStatusEnum("status").notNull().default("NOT_STARTED"),
    progressType: progressTypeEnum("progress_type").notNull().default("NONE"),
    // PERCENTAGE: "42" / PAGE: "124" / CHAPTER: "Chapter 4" / NONE: null
    progressValue: text("progress_value"),
    startedAt: timestamptz("started_at"),
    completedAt: timestamptz("completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("user_roadmap_step_progress_user_roadmap_id_step_id_unique").on(
      table.userRoadmapId,
      table.roadmapStepId,
    ),
    index("user_roadmap_step_progress_step_id_idx").on(table.roadmapStepId),
  ],
);
