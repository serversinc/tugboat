"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = require("dotenv");
const console_1 = require("../utils/console");
(0, dotenv_1.config)(); // Load environment variables from .env file
class HttpService {
    client = null;
    endpoint = "/events";
    constructor() {
        if (!process.env.TUGBOAT_PHONE_HOME_URL) {
            return;
        }
        this.client = axios_1.default.create({
            baseURL: process.env.TUGBOAT_PHONE_HOME_URL,
            timeout: 5000,
        });
    }
    async post(data) {
        if (!this.client) {
            (0, console_1.warn)("Http", "HTTP client is not initialized. Skipping POST request.");
            return;
        }
        try {
            const response = await this.client.post(this.endpoint, data, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            return response.data;
        }
        catch (error) {
            console.error(`HTTP POST to ${this.endpoint} failed:`, error.message);
            throw error;
        }
    }
}
exports.httpService = new HttpService();
