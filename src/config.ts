import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Define the schema with validation rules
const configSchema = z.object({
  PORT: z
    .string()
    .default("3000")
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().positive().max(65535)),

  CORE_URL: z.string().url("CORE_URL must be a valid URL").min(1, "CORE_URL is required"),

  SECRET_KEY: z.string().min(32, "SECRET_KEY must be at least 32 characters").optional(),

  DOCKER_SOCKET: z
    .string()
    .default("/var/run/docker.sock")
    .refine(val => val.startsWith("/") || val.startsWith("unix://") || val.startsWith("tcp://"), "DOCKER_SOCKET must be a valid socket path or URL"),

  HTTP_TIMEOUT: z
    .string()
    .default("5000")
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().positive().max(30000)),

  LOGGER_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  LOGGER_PRETTY: z
    .string()
    .default("false")
    .transform(val => val === "true")
    .pipe(z.boolean()),
});

// Infer the TypeScript type from the schema
export type AppConfig = z.infer<typeof configSchema>;

// Parse and validate environment variables
function loadConfig(): AppConfig {
  try {
    const config = configSchema.parse({
      PORT: process.env.PORT,
      CORE_URL: process.env.CORE_URL,
      SECRET_KEY: process.env.SECRET_KEY,
      DOCKER_SOCKET: process.env.DOCKER_SOCKET,
      HTTP_TIMEOUT: process.env.HTTP_TIMEOUT,
      LOGGER_LEVEL: process.env.LOGGER_LEVEL,
      LOGGER_PRETTY: process.env.LOGGER_PRETTY,
    });

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `  - ${err.path.join(".")}: ${err.message}`).join("\n");

      throw new Error(`Configuration validation failed:\n${errorMessages}\n\nPlease check your .env file.`);
    }
    throw error;
  }
}

export const config = loadConfig();

export default config;
