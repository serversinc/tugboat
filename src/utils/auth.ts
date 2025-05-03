import crypto from "crypto";
import fs from "fs";

import { httpService } from "../services/HttpService";

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
        console.log("TUGBOAT_SECRET_KEY loaded from .env file.");
        return;
      }
    }
  } catch (error: any) {
    console.error("Failed to read .env file:", error.message);
  }

  // Generate a new key if not found
  const newKey = crypto.randomBytes(32).toString("hex");
  process.env.TUGBOAT_SECRET_KEY = newKey;

  // Append the key to the .env file
  try {
    fs.appendFileSync(envPath, `TUGBOAT_SECRET_KEY=${newKey}\n`);
    console.log("TUGBOAT_SECRET_KEY saved to .env file.");
  } catch (error: any) {
    console.error("Failed to save TUGBOAT_SECRET_KEY to .env file:", error.message);
  }

  // Send the key to PHONE_HOME_URL if defined
  httpService
    .post({
      type: "secret_key_generated",
      secretKey: newKey,
    })
    .then(() => {
      console.log("New secret key sent to PHONE_HOME_URL.");
    })
    .catch(error => {
      console.error("Failed to send secret key to PHONE_HOME_URL:", error.message);
    });
}
