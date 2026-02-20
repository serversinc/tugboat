import pino from "pino";

// Log level can be controlled via env var TUGBOAT_LOG_LEVEL (default: info)
const level = process.env.TUGBOAT_LOG_LEVEL || "info";

// If pretty printing is desired in non-production, pino-pretty can be used by setting
// the environment var TUGBOAT_LOG_PRETTY=true. pino-pretty is listed as optionalDependency.
const pretty = process.env.TUGBOAT_LOG_PRETTY === "true";

const pinoOptions: pino.LoggerOptions = {
  level,
};

let logger: pino.Logger;
if (pretty) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const prettyTransport = require("pino-pretty");
  logger = pino(pinoOptions, prettyTransport({ colorize: true }));
} else {
  logger = pino(pinoOptions);
}

export function info(prefix: string, message: string, meta?: Record<string, unknown>) {
  logger.info({ prefix, ...meta }, message);
}

export function warn(prefix: string, message: string, meta?: Record<string, unknown>) {
  logger.warn({ prefix, ...meta }, message);
}

export function error(prefix: string, message: string, meta?: Record<string, unknown>) {
  logger.error({ prefix, ...meta }, message);
}

export function success(prefix: string, message: string, meta?: Record<string, unknown>) {
  logger.info({ prefix, success: true, ...meta }, message);
}
