import axios, { AxiosInstance } from "axios";
import { config } from "dotenv";
import { warn, error as logError } from "../utils/console";

config(); // Load environment variables from .env file

class HttpService {
  private client: AxiosInstance | null = null;
  private readonly endpoint = "/events";

  constructor() {
    if (!process.env.CORE_URL) {
      return;
    }

    this.client = axios.create({
      baseURL: process.env.CORE_URL,
      timeout: 5000,
    });
  }

  async post(data: any) {
    if (!this.client) {
      warn("Http", "HTTP client is not initialized. Skipping POST request.");
      return;
    }

    try {
      const response = await this.client.post(this.endpoint, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error: any) {
      logError("Http", "HTTP POST failed", { endpoint: this.endpoint, error: error.message });
      throw error;
    }
  }
}

export const httpService = new HttpService();
