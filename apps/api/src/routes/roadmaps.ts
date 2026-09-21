import { Hono } from "hono";
import { validate } from "../lib/validation";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { idParamSchema } from "../schemas/common.schema";
import {
  createRoadmapSchema,
  createStepSchema,
  listRoadmapsQuerySchema,
  reorderStepsSchema,
  roadmapSlugParamSchema,
  stepParamSchema,
  updateRoadmapSchema,
  updateStepSchema,
} from "../schemas/roadmap.schema";
import * as progressService from "../services/progress.service";
import * as roadmapService from "../services/roadmap.service";

// 認可 (creator のみ編集可 など) は Service が policies/roadmap.policy.ts を使って行う。
// Route には書かない。
export const roadmapsRoutes = new Hono()
  .get("/", validate("query", listRoadmapsQuerySchema), async (c) => {
    const page = await roadmapService.listPublicRoadmaps(c.req.valid("query"));
    return c.json(page, 200);
  })
  .post("/", requireAuth, validate("json", createRoadmapSchema), async (c) => {
    const roadmap = await roadmapService.createRoadmap(c.get("user"), c.req.valid("json"));
    return c.json(roadmap, 201);
  })
  .get("/:slug", optionalAuth, validate("param", roadmapSlugParamSchema), async (c) => {
    const roadmap = await roadmapService.getRoadmapBySlug(
      c.req.valid("param").slug,
      c.get("viewer"),
    );
    return c.json(roadmap, 200);
  })
  .patch(
    "/:id",
    requireAuth,
    validate("param", idParamSchema),
    validate("json", updateRoadmapSchema),
    async (c) => {
      const roadmap = await roadmapService.updateRoadmap(
        c.get("user"),
        c.req.valid("param").id,
        c.req.valid("json"),
      );
      return c.json(roadmap, 200);
    },
  )
  .delete("/:id", requireAuth, validate("param", idParamSchema), async (c) => {
    await roadmapService.deleteRoadmap(c.get("user"), c.req.valid("param").id);
    return c.body(null, 204);
  })
  .post("/:id/start", requireAuth, validate("param", idParamSchema), async (c) => {
    const myRoadmap = await progressService.startRoadmap(c.get("user"), c.req.valid("param").id);
    return c.json(myRoadmap, 201);
  })
  .post(
    "/:id/steps",
    requireAuth,
    validate("param", idParamSchema),
    validate("json", createStepSchema),
    async (c) => {
      const steps = await roadmapService.addStep(
        c.get("user"),
        c.req.valid("param").id,
        c.req.valid("json"),
      );
      return c.json({ steps }, 201);
    },
  )
  // "/:id/steps/:stepId" より先に定義する ("reorder" を stepId として解釈させない)
  .patch(
    "/:id/steps/reorder",
    requireAuth,
    validate("param", idParamSchema),
    validate("json", reorderStepsSchema),
    async (c) => {
      const steps = await roadmapService.reorderSteps(
        c.get("user"),
        c.req.valid("param").id,
        c.req.valid("json"),
      );
      return c.json({ steps }, 200);
    },
  )
  .patch(
    "/:id/steps/:stepId",
    requireAuth,
    validate("param", stepParamSchema),
    validate("json", updateStepSchema),
    async (c) => {
      const { id, stepId } = c.req.valid("param");
      const steps = await roadmapService.updateStep(c.get("user"), id, stepId, c.req.valid("json"));
      return c.json({ steps }, 200);
    },
  )
  .delete("/:id/steps/:stepId", requireAuth, validate("param", stepParamSchema), async (c) => {
    const { id, stepId } = c.req.valid("param");
    const steps = await roadmapService.deleteStep(c.get("user"), id, stepId);
    return c.json({ steps }, 200);
  });

export type RoadmapsRoutes = typeof roadmapsRoutes;
