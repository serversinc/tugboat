"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSecretKey = ensureSecretKey;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const Http_1 = require("../services/Http");
const console_1 = require("./console");
/**
 * Ensures that TUGBOAT_SECRET_KEY is set. If not, generates a new key,
 * stores it in the .env file, and optionally sends it to PHONE_HOME_URL.
 */
function ensureSecretKey() {
    const envPath = "/tugboat/.env";
    // Check if TUGBOAT_SECRET_KEY exists in the .env file
    try {
        if (fs_1.default.existsSync(envPath)) {
            const envContent = fs_1.default.readFileSync(envPath, "utf-8");
            const match = envContent.match(/^TUGBOAT_SECRET_KEY=(.+)$/m);
            if (match) {
                process.env.TUGBOAT_SECRET_KEY = match[1];
                (0, console_1.info)("Env", "TUGBOAT_SECRET_KEY loaded from .env file.");
                return;
            }
        }
    }
    catch (e) {
        (0, console_1.error)("Env", `Failed to read .env file: ${e.message}`);
    }
    // Generate a new key if not found
    const newKey = crypto_1.default.randomBytes(32).toString("hex");
    process.env.TUGBOAT_SECRET_KEY = newKey;
    // Append the key to the .env file
    try {
        fs_1.default.appendFileSync(envPath, `TUGBOAT_SECRET_KEY=${newKey}\n`);
        (0, console_1.info)("Env", "TUGBOAT_SECRET_KEY saved to .env file.");
    }
    catch (e) {
        (0, console_1.error)("Env", `Failed to save TUGBOAT_SECRET_KEY to .env file: ${e.message}`);
    }
    // Send the key to PHONE_HOME_URL if defined
    Http_1.httpService
        .post({
        type: "secret_key_generated",
        secretKey: newKey,
    })
        .then(() => {
        (0, console_1.info)("Env", "TUGBOAT_SECRET_KEY sent to PHONE_HOME_URL.");
    })
        .catch(e => {
        (0, console_1.error)("Env", `Failed to send TUGBOAT_SECRET_KEY to PHONE_HOME_URL: ${e.message}`);
    });
}
