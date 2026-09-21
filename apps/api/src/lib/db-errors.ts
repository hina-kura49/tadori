// PostgreSQL のエラーコード判定。
// Drizzle は pg のエラーを `cause` に包むことがあるため、両方を確認する。

const UNIQUE_VIOLATION = "23505";

function pgErrorOf(error: unknown): { code?: string; constraint?: string } | null {
  if (typeof error !== "object" || error === null) return null;
  if ("code" in error && typeof error.code === "string") {
    const constraint =
      "constraint" in error && typeof error.constraint === "string" ? error.constraint : undefined;
    return { code: error.code, constraint };
  }
  if ("cause" in error) return pgErrorOf(error.cause);
  return null;
}

/** constraint を渡すと、その制約名の UNIQUE 違反だけを true にする */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const pgError = pgErrorOf(error);
  if (pgError?.code !== UNIQUE_VIOLATION) return false;
  return constraint === undefined || pgError.constraint === constraint;
}

/** ILIKE 用に % _ \ をエスケープする */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
