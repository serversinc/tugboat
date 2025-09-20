import crypto from "crypto";
import fs from "fs";

import { httpService } from "../services/Http";
import { info, error } from "./console";

/**
 * Ensures that TUGBOAT_SECRET_KEY is set. If not, generates a new key,
 * stores it in the .env file, and optionally sends it to PHONE_HOME_URL.
 */
export function ensureSecretKey() {
  const envPath = "/tugboat/.env";

  // Check if TUGBOAT_SECRET_KEY exists in the .env file
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/^TUGBOAT_SECRET_KEY=(.+)$/m);
      if (match) {
        process.env.TUGBOAT_SECRET_KEY = match[1];
        info("Env", "TUGBOAT_SECRET_KEY loaded from .env file.");
        return;
      }
    }
  } catch (e: any) {
    error("Env", `Failed to read .env file: ${e.message}`);
  }

  // Generate a new key if not found
  const newKey = crypto.randomBytes(32).toString("hex");
  process.env.TUGBOAT_SECRET_KEY = newKey;

  // Append the key to the .env file
  try {
    fs.appendFileSync(envPath, `TUGBOAT_SECRET_KEY=${newKey}\n`);
    info("Env", "TUGBOAT_SECRET_KEY saved to .env file.");
  } catch (e: any) {
    error("Env", `Failed to save TUGBOAT_SECRET_KEY to .env file: ${e.message}`);
  }

  // Send the key to PHONE_HOME_URL if defined
  httpService
    .post({
      type: "secret_key_generated",
      secretKey: newKey,
    })
    .then(() => {
      info("Env", "TUGBOAT_SECRET_KEY sent to PHONE_HOME_URL.");
    })
    .catch(e => {
      error("Env", `Failed to send TUGBOAT_SECRET_KEY to PHONE_HOME_URL: ${e.message}`);
    });
}
