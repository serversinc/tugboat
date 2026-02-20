import { Context } from "hono";
import { error as logError } from "./console";

export function handleError(ctx: Context, err: unknown, resource: string, operation: string, meta?: Record<string, unknown>) {
  const error = err as Error;
  logError(resource, `Failed to ${operation}`, { error: error.message, ...meta });

  const statusCode = typeof error.message === "string" && error.message.toLowerCase().includes("not found") ? 404 : 500;

  return ctx.json({ error: error.message }, statusCode);
}
