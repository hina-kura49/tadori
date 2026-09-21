import { Hono } from "hono";
import { validate } from "../lib/validation";
import { requireAuth } from "../middleware/auth";
import {
  deviceParamSchema,
  registerDeviceSchema,
  updateMeSchema,
  updateNotificationPreferenceSchema,
} from "../schemas/me.schema";
import {
  listMyRoadmapsQuerySchema,
  updateStepProgressSchema,
  updateUserRoadmapSchema,
  userRoadmapParamSchema,
  userRoadmapStepParamSchema,
} from "../schemas/progress.schema";
import * as circleService from "../services/circle.service";
import * as dashboardService from "../services/dashboard.service";
import * as deviceService from "../services/device.service";
import * as notificationPreferenceService from "../services/notification-preference.service";
import * as progressService from "../services/progress.service";
import * as userService from "../services/user.service";

// /me 以下はすべて「ログイン中の本人」のデータ。
// Service へは必ず c.get("user") を渡し、URL や body の userId は一切受け取らない。
export const meRoutes = new Hono()
  .use(requireAuth)
  .get("/", async (c) => {
    const user = await userService.getCurrentUser(c.get("user"));
    return c.json(user, 200);
  })
  .patch("/", validate("json", updateMeSchema), async (c) => {
    const user = await userService.updateCurrentUser(c.get("user"), c.req.valid("json"));
    return c.json(user, 200);
  })
  .get("/dashboard", async (c) => {
    const dashboard = await dashboardService.getDashboard(c.get("user"));
    return c.json(dashboard, 200);
  })
  .delete("/", async (c) => {
    await userService.deleteCurrentUser(c.get("user"));
    return c.body(null, 204);
  })
  .get("/roadmaps", validate("query", listMyRoadmapsQuerySchema), async (c) => {
    const items = await progressService.listMyRoadmaps(c.get("user"), c.req.valid("query"));
    return c.json({ items }, 200);
  })
  .patch(
    "/roadmaps/:userRoadmapId",
    validate("param", userRoadmapParamSchema),
    validate("json", updateUserRoadmapSchema),
    async (c) => {
      const myRoadmap = await progressService.updateUserRoadmapStatus(
        c.get("user"),
        c.req.valid("param").userRoadmapId,
        c.req.valid("json"),
      );
      return c.json(myRoadmap, 200);
    },
  )
  .patch(
    "/roadmaps/:userRoadmapId/steps/:stepId",
    validate("param", userRoadmapStepParamSchema),
    validate("json", updateStepProgressSchema),
    async (c) => {
      const { userRoadmapId, stepId } = c.req.valid("param");
      const myRoadmap = await progressService.updateStepProgress(
        c.get("user"),
        userRoadmapId,
        stepId,
        c.req.valid("json"),
      );
      return c.json(myRoadmap, 200);
    },
  )
  .get("/circles", async (c) => {
    const items = await circleService.listMyCircles(c.get("user"));
    return c.json({ items }, 200);
  })
  .post("/devices", validate("json", registerDeviceSchema), async (c) => {
    const device = await deviceService.registerDevice(c.get("user"), c.req.valid("json"));
    return c.json(device, 200);
  })
  .delete("/devices/:deviceId", validate("param", deviceParamSchema), async (c) => {
    await deviceService.disableDevice(c.get("user"), c.req.valid("param").deviceId);
    return c.body(null, 204);
  })
  .get("/notification-preferences", async (c) => {
    const preferences = await notificationPreferenceService.getPreferences(c.get("user"));
    return c.json(preferences, 200);
  })
  .patch(
    "/notification-preferences",
    validate("json", updateNotificationPreferenceSchema),
    async (c) => {
      const preferences = await notificationPreferenceService.updatePreferences(
        c.get("user"),
        c.req.valid("json"),
      );
      return c.json(preferences, 200);
    },
  );

export type MeRoutes = typeof meRoutes;
