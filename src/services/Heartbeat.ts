import os from "os";
import axios from "axios";
import { Container } from "dockerode";

import { DockerService } from "./Docker";

export class HeartbeatService {
  private interval: NodeJS.Timeout | null = null;

  private docker: DockerService;

  constructor(dockerService: DockerService) {
    this.docker = dockerService;
    console.log("Heartbeat service initialized");
  }

  start(): void {
    if (this.interval) {
      console.warn("Heartbeat service is already running.");
      return;
    }

    this.sendHeartbeat(); // Initial call right away

    this.interval = setInterval(() => {
      this.sendHeartbeat();
    }, parseInt(process.env.TUGBOAT_PHONE_HOME_INTERVAL as string));

    console.log("Heartbeat service started");
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log("Heartbeat service stopped");
    }
  }

  async getContainers(): Promise<Container[]> {
    return this.docker.listContainers();
  }

  async getUsage(): Promise<any> {
    const cpu = {
      cores: os.cpus().length,
      load: os.loadavg(),
    };

    const memory = {
      total: Math.ceil(os.totalmem() / 1024 / 1024 / 1024) + "GB",
      free: Math.ceil(os.freemem() / 1024 / 1024 / 1024) + "GB",
    };

    return {
      cpu,
      memory,
      uptime: Math.ceil(os.uptime() / 60),
    };
  }

  async sendHeartbeat(): Promise<void> {
    const containers = await this.getContainers();
    const usage = await this.getUsage();

    try {
      const response = await axios.post(
        process.env.TUGBOAT_PHONE_HOME_URL as string,
        {
          type: "heartbeat",
          containers,
          usage,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.TUGBOAT_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status !== 200) {
        console.error("Failed to phone home.");
      } else {
        console.log("Successfully phoned home.");
      }
    } catch (error) {
      console.error("Error sending heartbeat:", error);
    }
  }
}
