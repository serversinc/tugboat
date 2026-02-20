import pino from "pino";
import { getRequestId } from "./requestContext";

const level  = process.env.LOGGER_LEVEL || "info";
const pretty = process.env.LOGGER_PRETTY === "true";

const pinoOptions: pino.LoggerOptions = {
  level,
};

let logger: pino.Logger;

if (pretty) {
  try {
    // Dynamic import only when needed
    const prettyTransport = require("pino-pretty");
    logger = pino(pinoOptions, prettyTransport({ colorize: true }));
  } catch (error) {
    console.warn("pino-pretty not installed, falling back to standard logger");
    logger = pino(pinoOptions);
  }
} else {
  logger = pino(pinoOptions);
}

// Helper to attach request context
function logWithContext(logFn: (obj: Record<string, unknown>, msg: string) => void, prefix: string, message: string, meta?: Record<string, unknown>) {
  const requestId = getRequestId();
  logFn({ prefix, requestId, ...meta }, message);
}

export function info(prefix: string, message: string, meta?: Record<string, unknown>) {
  logWithContext(logger.info.bind(logger), prefix, message, meta);
}

export function warn(prefix: string, message: string, meta?: Record<string, unknown>) {
  logWithContext(logger.warn.bind(logger), prefix, message, meta);
}

export function error(prefix: string, message: string, meta?: Record<string, unknown>) {
  logWithContext(logger.error.bind(logger), prefix, message, meta);
}

export function success(prefix: string, message: string, meta?: Record<string, unknown>) {
  logWithContext(logger.info.bind(logger), prefix, message, { success: true, ...meta });
}
