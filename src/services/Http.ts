import axios, { AxiosInstance, AxiosError } from "axios";
import { warn, error as logError, info } from "../utils/console";
import config from "../config";

interface EventPayload {
  type: string;
  [key: string]: unknown;
}

class HttpService {
  private client: AxiosInstance | null = null;
  private readonly endpoint = "/events";
  private readonly serviceName = "Http";

  constructor() {
    const baseURL   = config.CORE_URL;
    const timeout   = config.HTTP_TIMEOUT;
    const secretKey = config.SECRET_KEY;

    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        "Content-Type": "application/json",
        ...(secretKey && { Authorization: `Bearer ${secretKey}` }),
      },
    });

    // Add response interceptor for better error handling
    this.client.interceptors.response.use(
      response => response,
      error => this.handleError(error),
    );

    info(this.serviceName, "HTTP client initialized", { baseURL, timeout });
  }

  async post<T = any>(data: EventPayload): Promise<T | void> {
    if (!this.client) {
      warn(this.serviceName, "HTTP client not initialized, skipping POST request");
      return;
    }

    try {
      const response = await this.client.post<T>(this.endpoint, data);
      return response.data;
    } catch (error) {
      // Error already logged in interceptor
      throw error;
    }
  }

  /**
   * Post without throwing - useful for fire-and-forget events
   */
  async postSafe(data: EventPayload): Promise<boolean> {
    try {
      await this.post(data);
      return true;
    } catch (error) {
      // Already logged, just return false
      return false;
    }
  }

  /**
   * Check if the client is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  private handleError(error: AxiosError): Promise<never> {
    const errorData = {
      endpoint: this.endpoint,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
    };

    if (error.code === "ECONNABORTED") {
      logError(this.serviceName, "Request timeout", errorData);
    } else if (error.response) {
      // Server responded with error status
      logError(this.serviceName, "Server error", {
        ...errorData,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response
      logError(this.serviceName, "No response from server", errorData);
    } else {
      // Something else happened
      logError(this.serviceName, "Request failed", errorData);
    }

    return Promise.reject(error);
  }
}

// Export singleton instance
export const httpService = new HttpService();

// Also export class for testing or custom instances
export { HttpService };
