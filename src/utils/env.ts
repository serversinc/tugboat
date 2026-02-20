// Checks all environment variables are set

import { info } from "./console";

export function checkEnv() {
  const requiredEnv = ["TUGBOAT_PORT"];
  const optionalEnv = ["CORE_URL", "TUGBOAT_ENABLE_HEARTBEAT"];

  for (const env of requiredEnv) {
    if (!process.env[env]) {
      throw new Error(`${env} environment variable is required`);
    }
  }

  for (const env of optionalEnv) {
    if (!process.env[env]) {
      info("Env", `${env} environment variable is not set, skipping`);
    }
  }
}
