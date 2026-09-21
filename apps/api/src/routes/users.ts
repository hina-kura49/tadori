import { Hono } from "hono";
import { z } from "zod";
import { validate } from "../lib/validation";
import { usernameSchema } from "../schemas/common.schema";
import * as userService from "../services/user.service";

export const usersRoutes = new Hono().get(
  "/:username",
  validate("param", z.object({ username: usernameSchema })),
  async (c) => {
    const profile = await userService.getLearningProfile(c.req.valid("param").username);
    return c.json(profile, 200);
  },
);

export type UsersRoutes = typeof usersRoutes;
