import Docker, { AuthConfig } from "dockerode";
import { exec } from "child_process";
import { promisify } from "util";

import dotenv from "dotenv";
import { normalizeContainer } from "../utils/transformers";
import { error, info } from "../utils/console";
dotenv.config();

const execAsync = promisify(exec);

export class DockerService {

  public name = "Docker";

  public docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: "/var/run/docker.sock" });
    info(this.name, "Initialized Docker client");
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

  async pullImage(name: string, auth?: { username?: string; password?: string; registry?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      info(this.name, `Attempting to pull image: ${name}`);

      let authconfig: AuthConfig | undefined = undefined;
      if (auth && auth.username && auth.password && auth.registry) {
        authconfig = {
          username: auth.username,
          password: auth.password,
          serveraddress: auth.registry,
          auth: '',
        };

        this.docker.checkAuth(authconfig, (err: any) => {
          if (err) {
            error(this.name, `Authentication failed for image ${name}: ${err.message}`);
            return reject(err);
          }
          info(this.name, `Authentication successful for image ${name}`);
        });
      }

      this.docker.pull(name, { 'authconfig': authconfig }, (err: any, stream: any) => {
        if (err) {
          error(this.name, `Error pulling image ${name}: ${err.message}`);
          return reject(err);
        }

        this.docker.modem.followProgress(
          stream,
          (err, output) => {
            if (err) {
              error(this.name, `Error during followProgress for image ${name}: ${err.message}`);
              return reject(err);
            }

            info(this.name, `Successfully pulled image: ${name}`);
            resolve();
          },
          (event: any) => {
            if (event && event.status) {
              info(this.name, `Pulling image ${name}: ${event.status} ${event.progress || ''}`);
            }
          }
        );
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

  /** COMPOSE */
  async startCompose(directory: string): Promise<void> {
    const command = `docker-compose -f ${directory}/docker-compose.yml up -d`;
    info(this.name, `Starting compose in ${directory}`);
    await execAsync(command);
    info(this.name, `Compose started successfully in ${directory}`);
  }

  async stopCompose(directory: string): Promise<void> {
    const command = `docker-compose -f ${directory}/docker-compose.yml down`;
    info(this.name, `Stopping compose in ${directory}`);
    await execAsync(command);
    info(this.name, `Compose stopped successfully in ${directory}`);
  }
}
