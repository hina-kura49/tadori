import type { ContentfulStatusCode } from "hono/utils/http-status";

// API が返すエラーコードの一覧。
// 新しいエラーを追加するときは、まずここにコードを足す。
export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INTERNAL_ERROR",
  "USER_NOT_FOUND",
  "USERNAME_TAKEN",
  "BOOK_NOT_FOUND",
  "BOOK_ALREADY_EXISTS",
  "ROADMAP_NOT_FOUND",
  "ROADMAP_STEP_NOT_FOUND",
  "ROADMAP_HAS_NO_STEPS",
  "ROADMAP_ALREADY_STARTED",
  "INVALID_STEP_ORDER",
  "USER_ROADMAP_NOT_FOUND",
  "CIRCLE_NOT_FOUND",
  "CIRCLE_FULL",
  "CIRCLE_ALREADY_MEMBER",
  "CIRCLE_NOT_MEMBER",
  "CIRCLE_OWNER_CANNOT_LEAVE",
  "CIRCLE_INVITE_REQUIRED",
  "CIRCLE_INVALID_TARGET",
  "CIRCLE_SCHEDULE_NOT_FOUND",
  "DEVICE_NOT_FOUND",
  "PUSH_TOKEN_IN_USE",
  "RATE_LIMITED",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** クライアントへ返すエラーの統一形式 */
export type ErrorResponseBody = {
  code: ErrorCode;
  message: string;
  /** VALIDATION_ERROR のときだけ付く */
  details?: { path: string; message: string }[];
};

/**
 * Service / Policy / Middleware から throw するアプリケーションエラー。
 * app.ts の onError が ErrorResponseBody に変換する。
 */
export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorResponseBody["details"],
  ) {
    super(message);
    this.name = "AppError";
  }

  toBody(): ErrorResponseBody {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export const unauthorized = (message = "Authentication required") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "You are not allowed to perform this action") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (code: ErrorCode, message: string) => new AppError(404, code, message);

export const conflict = (code: ErrorCode, message: string) => new AppError(409, code, message);

export const badRequest = (code: ErrorCode, message: string) => new AppError(400, code, message);

export const tooManyRequests = (message = "Too many requests. Please try again later.") =>
  new AppError(429, "RATE_LIMITED", message);
