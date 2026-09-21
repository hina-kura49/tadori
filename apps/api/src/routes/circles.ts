import { Hono } from "hono";
import { validate } from "../lib/validation";
import { optionalAuth, requireAuth } from "../middleware/auth";
import {
  createCircleSchema,
  createScheduleSchema,
  inviteToCircleSchema,
  listCirclesQuerySchema,
  scheduleParamSchema,
  updateCircleSchema,
  updateScheduleSchema,
} from "../schemas/circle.schema";
import { idParamSchema } from "../schemas/common.schema";
import * as circleService from "../services/circle.service";

// 認可 (OWNER のみ / INVITE_ONLY の閲覧制限) は Service が policies/circle.policy.ts で行う。
export const circlesRoutes = new Hono()
  .get("/", validate("query", listCirclesQuerySchema), async (c) => {
    const page = await circleService.listPublicCircles(c.req.valid("query"));
    return c.json(page, 200);
  })
  .post("/", requireAuth, validate("json", createCircleSchema), async (c) => {
    const circle = await circleService.createCircle(c.get("user"), c.req.valid("json"));
    return c.json(circle, 201);
  })
  .get("/:id", optionalAuth, validate("param", idParamSchema), async (c) => {
    const circle = await circleService.getCircleDetail(c.req.valid("param").id, c.get("viewer"));
    return c.json(circle, 200);
  })
  .patch(
    "/:id",
    requireAuth,
    validate("param", idParamSchema),
    validate("json", updateCircleSchema),
    async (c) => {
      const circle = await circleService.updateCircle(
        c.get("user"),
        c.req.valid("param").id,
        c.req.valid("json"),
      );
      return c.json(circle, 200);
    },
  )
  .delete("/:id", requireAuth, validate("param", idParamSchema), async (c) => {
    await circleService.deleteCircle(c.get("user"), c.req.valid("param").id);
    return c.body(null, 204);
  })
  .post("/:id/join", requireAuth, validate("param", idParamSchema), async (c) => {
    const circle = await circleService.joinCircle(c.get("user"), c.req.valid("param").id);
    return c.json(circle, 200);
  })
  .post("/:id/leave", requireAuth, validate("param", idParamSchema), async (c) => {
    await circleService.leaveCircle(c.get("user"), c.req.valid("param").id);
    return c.body(null, 204);
  })
  .post(
    "/:id/invites",
    requireAuth,
    validate("param", idParamSchema),
    validate("json", inviteToCircleSchema),
    async (c) => {
      await circleService.inviteToCircle(
        c.get("user"),
        c.req.valid("param").id,
        c.req.valid("json"),
      );
      return c.body(null, 204);
    },
  )
  .post(
    "/:id/schedules",
    requireAuth,
    validate("param", idParamSchema),
    validate("json", createScheduleSchema),
    async (c) => {
      const schedule = await circleService.createSchedule(
        c.get("user"),
        c.req.valid("param").id,
        c.req.valid("json"),
      );
      return c.json(schedule, 201);
    },
  )
  .patch(
    "/:id/schedules/:scheduleId",
    requireAuth,
    validate("param", scheduleParamSchema),
    validate("json", updateScheduleSchema),
    async (c) => {
      const { id, scheduleId } = c.req.valid("param");
      const schedule = await circleService.updateSchedule(
        c.get("user"),
        id,
        scheduleId,
        c.req.valid("json"),
      );
      return c.json(schedule, 200);
    },
  )
  .delete(
    "/:id/schedules/:scheduleId",
    requireAuth,
    validate("param", scheduleParamSchema),
    async (c) => {
      const { id, scheduleId } = c.req.valid("param");
      await circleService.deleteSchedule(c.get("user"), id, scheduleId);
      return c.body(null, 204);
    },
  );

export type CirclesRoutes = typeof circlesRoutes;
