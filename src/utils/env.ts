// Checks all environment variables are set

import { info } from "./console";

export function checkEnv() {
  const requiredEnv = ["PORT"];
  const optionalEnv = ["CORE_URL"];

  for (const env of requiredEnv) {
    if (!process.env[env]) {
      throw new Error(`${env} environment variable is required`);
    }
  }

  for (const env of optionalEnv) {
    if (!process.env[env]) {
      info("Env", "Optional env not set", { variable: env });
    }
  }
}
