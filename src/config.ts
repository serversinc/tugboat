import dotenv from "dotenv";
dotenv.config();

export interface AppConfig {
  PORT: number;
  CORE_URL: string;
  SECRET_KEY?: string;
  DOCKER_SOCKET: string;
  HTTP_TIMEOUT: number;
  LOGGER_LEVEL?: string;
  LOGGER_PRETTY: boolean;
  ENV_PATH?: string;
}

export const config: AppConfig = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  CORE_URL: process.env.CORE_URL || "",
  SECRET_KEY: process.env.SECRET_KEY,
  DOCKER_SOCKET: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
  HTTP_TIMEOUT: process.env.HTTP_TIMEOUT ? parseInt(process.env.HTTP_TIMEOUT, 10) : 5000,
  LOGGER_LEVEL: process.env.LOGGER_LEVEL || undefined,
  LOGGER_PRETTY: process.env.LOGGER_PRETTY === "true",
  ENV_PATH: process.env.ENV_PATH,
};

export function assertRequireEnvs(required: string[] = ["PORT", "CORE_URL", "SECRET_KEY"]) {
  const missing: string[] = [];

  for (const name of required) {
    if (!process.env[name]) missing.push(name);
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export default config;
