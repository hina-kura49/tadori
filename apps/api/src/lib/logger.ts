import { env } from "./env";

// アプリ内のログ出力はすべてここを通す (console.* を直接呼ばない)。
// - development: 人間が読みやすい 1 行
// - production : JSON 1 行 (ログ基盤で集計しやすい形)
// - test       : 既定で silent
//
// 注意: context に token / cookie / password / email などを入れないこと。

const LEVELS = ["debug", "info", "warn", "error", "silent"] as const;
type Level = (typeof LEVELS)[number];
type LogContext = Record<string, unknown>;

function defaultLevel(): Level {
  if (env.NODE_ENV === "test") return "silent";
  if (env.NODE_ENV === "production") return "info";
  return "debug";
}

const activeLevel: Level = env.LOG_LEVEL ?? defaultLevel();

function serializeError(error: unknown): LogContext {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function write(level: Exclude<Level, "silent">, message: string, context?: LogContext) {
  if (LEVELS.indexOf(level) < LEVELS.indexOf(activeLevel)) return;

  const normalized =
    context && "error" in context
      ? { ...context, error: serializeError(context.error) }
      : context;

  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;

  if (env.NODE_ENV === "production") {
    stream.write(
      `${JSON.stringify({ level, time: new Date().toISOString(), message, ...normalized })}\n`,
    );
    return;
  }

  const suffix = normalized ? ` ${JSON.stringify(normalized)}` : "";
  stream.write(`[${level.toUpperCase()}] ${message}${suffix}\n`);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
