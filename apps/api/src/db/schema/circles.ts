import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { books } from "./books";
import { createdAt, id, timestamptz, updatedAt } from "./columns";
import { circleMemberRoleEnum, circleTargetTypeEnum, circleVisibilityEnum } from "./enums";
import { roadmaps } from "./roadmaps";

// onDelete の方針:
// - Circle の creator (User) / 対象 Roadmap が消えたら Circle も CASCADE で消える
// - 対象 Book は RESTRICT (Circle がある Book は消せない)

export const circles = pgTable(
  "circles",
  {
    id: id(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    targetType: circleTargetTypeEnum("target_type").notNull(),
    bookId: uuid("book_id").references(() => books.id, { onDelete: "restrict" }),
    roadmapId: uuid("roadmap_id").references(() => roadmaps.id, { onDelete: "cascade" }),
    visibility: circleVisibilityEnum("visibility").notNull().default("PUBLIC"),
    startDate: date("start_date", { mode: "string" }),
    targetEndDate: date("target_end_date", { mode: "string" }),
    maxMembers: integer("max_members").notNull().default(10),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // BOOK Circle なら bookId のみ、ROADMAP Circle なら roadmapId のみを持つ
    check(
      "circles_target_check",
      sql`(${table.targetType} = 'BOOK' AND ${table.bookId} IS NOT NULL AND ${table.roadmapId} IS NULL)
        OR (${table.targetType} = 'ROADMAP' AND ${table.roadmapId} IS NOT NULL AND ${table.bookId} IS NULL)`,
    ),
    check("circles_max_members_check", sql`${table.maxMembers} >= 2`),
    index("circles_visibility_created_at_id_idx").on(table.visibility, table.createdAt, table.id),
    index("circles_book_id_idx").on(table.bookId),
    index("circles_roadmap_id_idx").on(table.roadmapId),
  ],
);

export const circleMembers = pgTable(
  "circle_members",
  {
    id: id(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: circleMemberRoleEnum("role").notNull().default("MEMBER"),
    joinedAt: timestamptz("joined_at").notNull().defaultNow(),
  },
  (table) => [
    unique("circle_members_circle_id_user_id_unique").on(table.circleId, table.userId),
    index("circle_members_user_id_idx").on(table.userId),
  ],
);

// INVITE_ONLY Circle への招待。参加したら行を削除する。
export const circleInvites = pgTable(
  "circle_invites",
  {
    id: id(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    invitedUserId: text("invited_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    invitedById: text("invited_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    unique("circle_invites_circle_id_invited_user_id_unique").on(
      table.circleId,
      table.invitedUserId,
    ),
    index("circle_invites_invited_user_id_idx").on(table.invitedUserId),
  ],
);

export const circleSchedules = pgTable(
  "circle_schedules",
  {
    id: id(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    scheduledAt: timestamptz("scheduled_at").notNull(),
    description: text("description"),
    // Meeting Reminder の二重送信防止。送信済みなら時刻が入る
    reminderSentAt: timestamptz("reminder_sent_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("circle_schedules_circle_id_scheduled_at_idx").on(table.circleId, table.scheduledAt)],
);
