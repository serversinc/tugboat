import crypto from "crypto";
import fs from "fs";

import { httpService } from "../services/Http";
import { info, error } from "./console";

/**
 * Ensures that SECRET_KEY is set. If not, generates a new key,
 * stores it in the .env file, and optionally sends it to CORE_URL.
 */
export function ensureSecretKey() {
  const envPath = "/tugboat/.env";

  // Check if SECRET_KEY exists in the .env file
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/^SECRET_KEY=(.+)$/m);
      if (match) {
        process.env.SECRET_KEY = match[1];
        info("Env", "SECRET_KEY loaded from .env file.");
        return;
      }
    }
  } catch (e: any) {
    error("Env", "Failed to read .env file", { error: e.message });
  }

  // Generate a new key if not found
  const newKey = crypto.randomBytes(32).toString("hex");
  process.env.SECRET_KEY = newKey;

  // Append the key to the .env file
  try {
    fs.appendFileSync(envPath, `SECRET_KEY=${newKey}\n`);
    info("Env", "SECRET_KEY saved to .env file.");
  } catch (e: any) {
    error("Env", "Failed to save SECRET_KEY to .env file", { error: e.message });
  }

  // Send the key to CORE_URL if defined
  httpService
    .post({
      type: "secret_key_generated",
      secretKey: newKey,
    })
    .then(() => {
      info("Env", "SECRET_KEY sent to CORE_URL.");
    })
    .catch(e => {
      error("Env", "Failed to send SECRET_KEY to CORE_URL", { error: e.message });
    });
}
