import Docker from "dockerode";

import dotenv from "dotenv";
import { normalizeContainer } from "../utils/transformers";
dotenv.config();

export class DockerService {
  public docker: Docker;

  constructor() {
    if (process.env.DOCKER_PLATFORM === "windows") {
      this.docker = new Docker({ socketPath: "//./pipe/docker_engine" });
    } else {
      this.docker = new Docker({ socketPath: "/var/run/docker.sock" });
    }

    console.log("Docker client initialized");
  }

  async listContainers(): Promise<any[]> {
    const containers = await this.docker.listContainers();
    return containers.map(container => normalizeContainer(container));
  }

  async startContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.start();
  }

  async stopContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.stop();
  }
}
