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
    const containers = await this.docker.listContainers({
      all: true,
    });
    return containers.map(container => normalizeContainer(container));
  }

  async getContainer(id: string): Promise<Docker.ContainerInspectInfo> {
    const container = this.docker.getContainer(id);
    return await container.inspect();
  }

  async createContainer(options: Docker.ContainerCreateOptions): Promise<Docker.Container> {
    return await this.docker.createContainer(options);
  }

  async removeContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.remove();
  }

  async restartContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.restart();
  }

  async startContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.start();
  }

  async stopContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.stop();
  }

  /** IMAGES */
  async listImages(): Promise<Docker.ImageInfo[]> {
    return await this.docker.listImages();
  }

  async getImage(id: string): Promise<Docker.ImageInspectInfo> {
    return await this.docker.getImage(id).inspect();
  }

  async pullImage(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.docker.pull(name, (err: any, stream: any) => {
        if (err) {
          reject(err);
        }

        this.docker.modem.followProgress(stream, (err, output) => {
          if (err) {
            reject(err);
          }

          resolve();
        });
      });
    });
  }

  async removeImage(id: string): Promise<void> {
    return await this.docker.getImage(id).remove();
  }

  async pruneImages(): Promise<Docker.PruneImagesInfo> {
    return await this.docker.pruneImages();
  }

  async checkImageExists(id: string): Promise<boolean> {
    try {
      await this.docker.getImage(id).inspect();
      return true;
    } catch (err: any) {
      if (err.statusCode === 404) {
        return false;
      }
      throw err;
    }
  }
}
