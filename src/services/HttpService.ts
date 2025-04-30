import axios, { AxiosInstance } from "axios";
import { config } from "dotenv";

config(); // Load environment variables from .env file

class HttpService {
  private client: AxiosInstance;
  private readonly endpoint = "/"; // Hardcoded endpoint

  constructor() {
    if (!process.env.TUGBOAT_PHONE_HOME_URL) {
      throw new Error("TUGBOAT_PHONE_HOME_URL environment variable is required");
    }

    this.client = axios.create({
      baseURL: process.env.TUGBOAT_PHONE_HOME_URL, // Set the base URL
      timeout: 5000, // Set a default timeout
    });
  }

  async post(data: any) {
    try {
      const response = await this.client.post(this.endpoint, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error: any) {
      console.error(`HTTP POST to ${this.endpoint} failed:`, error.message);
      throw error;
    }
  }
}

export const httpService = new HttpService();
