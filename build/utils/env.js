"use strict";
// Checks all environment variables are set
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEnv = checkEnv;
const console_1 = require("./console");
function checkEnv() {
    const requiredEnv = ["TUGBOAT_PORT"];
    const optionalEnv = ["TUGBOAT_PHONE_HOME_URL"];
    for (const env of requiredEnv) {
        if (!process.env[env]) {
            throw new Error(`${env} environment variable is required`);
        }
    }
    for (const env of optionalEnv) {
        if (!process.env[env]) {
            (0, console_1.info)("Env", `${env} environment variable is not set, skipping`);
        }
    }
}
