import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { AppError, type ErrorResponseBody } from "../lib/errors";
import { logger } from "../lib/logger";

// すべてのエラーを { code, message } の統一形式に変換する。
// 想定外のエラーの詳細はクライアントへ返さず、ログにだけ残す。

export const handleError: ErrorHandler = (error, c) => {
  if (error instanceof AppError) {
    return c.json(error.toBody(), error.status);
  }

  if (error instanceof HTTPException) {
    // 例: 壊れた JSON body を送った場合 (Hono が 400 を投げる)
    const body: ErrorResponseBody =
      error.status === 400
        ? { code: "VALIDATION_ERROR", message: "Malformed request" }
        : { code: "INTERNAL_ERROR", message: "Request failed" };
    return c.json(body, error.status);
  }

  logger.error("Unhandled error", { method: c.req.method, path: c.req.path, error });
  const body: ErrorResponseBody = { code: "INTERNAL_ERROR", message: "Internal server error" };
  return c.json(body, 500);
};

export const handleNotFound: NotFoundHandler = (c) => {
  const body: ErrorResponseBody = { code: "NOT_FOUND", message: "Route not found" };
  return c.json(body, 404);
};
