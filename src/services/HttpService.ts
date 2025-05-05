import axios, { AxiosInstance } from "axios";
import { config } from "dotenv";

config(); // Load environment variables from .env file

class HttpService {
  private client: AxiosInstance | null = null; // Axios instance for HTTP requests
  private readonly endpoint = "/"; // Hardcoded endpoint

  constructor() {
    if (!process.env.TUGBOAT_PHONE_HOME_URL) {
      return;
    }

    this.client = axios.create({
      baseURL: process.env.TUGBOAT_PHONE_HOME_URL, // Set the base URL
      timeout: 5000, // Set a default timeout
    });
  }

  async post(data: any) {
    if (!this.client) {
      console.warn("HTTP client is not initialized. Skipping POST request.");
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
      console.error(`HTTP POST to ${this.endpoint} failed:`, error.message);
      throw error;
    }
  }
}

export const httpService = new HttpService();
