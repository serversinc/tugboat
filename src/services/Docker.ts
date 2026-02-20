import Docker, { AuthConfigObject } from "dockerode";
import { normalizeContainer } from "../utils/transformers";
import { error, info } from "../utils/console";
import config from "../config";

interface PullImageAuth {
  username: string;
  password: string;
  registry: string;
}

interface PullProgressEvent {
  status?: string;
  progress?: string;
  id?: string;
}

export class DockerService {
  public readonly name = "Docker";
  public readonly docker: Docker;

  constructor(socketPath: string = config.DOCKER_SOCKET) {
    this.docker = new Docker({ socketPath });
    info(this.name, "Initialized Docker client", { socketPath });
  }

  // CONTAINERS

  async listContainers(): Promise<any[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      return containers.map(container => normalizeContainer(container));
    } catch (err) {
      error(this.name, "Failed to list containers", { error: (err as Error).message });
      throw err;
    }
  }

  async getContainer(id: string): Promise<Docker.ContainerInspectInfo> {
    try {
      const container = this.docker.getContainer(id);
      return await container.inspect();
    } catch (err) {
      error(this.name, "Failed to get container", { id, error: (err as Error).message });
      throw err;
    }
  }

  async createContainer(options: Docker.ContainerCreateOptions): Promise<Docker.Container> {
    try {
      return await this.docker.createContainer(options);
    } catch (err) {
      error(this.name, "Failed to create container", {
        name: options.name,
        image: options.Image,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  async removeContainer(id: string, force: boolean = false): Promise<void> {
    try {
      const container = this.docker.getContainer(id);
      await container.remove({ force });
    } catch (err) {
      error(this.name, "Failed to remove container", { id, error: (err as Error).message });
      throw err;
    }
  }

  async restartContainer(id: string): Promise<void> {
    try {
      const container = this.docker.getContainer(id);
      await container.restart();
    } catch (err) {
      error(this.name, "Failed to restart container", { id, error: (err as Error).message });
      throw err;
    }
  }

  async startContainer(id: string): Promise<void> {
    try {
      const container = this.docker.getContainer(id);
      await container.start();
    } catch (err) {
      error(this.name, "Failed to start container", { id, error: (err as Error).message });
      throw err;
    }
  }

  async stopContainer(id: string, timeout: number = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(id);
      await container.stop({ t: timeout });
    } catch (err) {
      error(this.name, "Failed to stop container", { id, error: (err as Error).message });
      throw err;
    }
  }

  // IMAGES

  async listImages(): Promise<Docker.ImageInfo[]> {
    try {
      return await this.docker.listImages();
    } catch (err) {
      error(this.name, "Failed to list images", { error: (err as Error).message });
      throw err;
    }
  }

  async getImage(id: string): Promise<Docker.ImageInspectInfo> {
    try {
      return await this.docker.getImage(id).inspect();
    } catch (err) {
      error(this.name, "Failed to get image", { id, error: (err as Error).message });
      throw err;
    }
  }

  async pullImage(name: string, auth?: Partial<PullImageAuth>): Promise<void> {
    info(this.name, "Pulling image", { name });

    const authconfig = this.buildAuthConfig(auth);

    // Validate auth if provided
    if (authconfig) {
      await this.validateAuth(authconfig, name);
    }

    return new Promise((resolve, reject) => {
      this.docker.pull(name, { authconfig }, (err, stream) => {
        if (err) {
          error(this.name, "Failed to pull image", { name, error: err.message });
          return reject(err);
        }

        if (!stream) {
          error(this.name, "No stream returned from pull", { name });
          return reject(new Error("No stream returned from Docker pull"));
        }

        this.docker.modem.followProgress(
          stream,
          (err, output) => {
            if (err) {
              error(this.name, "Image pull failed", { name, error: err.message });
              return reject(err);
            }
            info(this.name, "Successfully pulled image", { name });
            resolve();
          },
          (event: PullProgressEvent) => {
            if (event?.status) {
              // Only log significant progress events to reduce noise
              if (this.isSignificantProgressEvent(event.status)) {
                info(this.name, "Image pull progress", {
                  name,
                  status: event.status,
                  progress: event.progress,
                });
              }
            }
          },
        );
      });
    });
  }

  async removeImage(id: string, force: boolean = false): Promise<void> {
    try {
      await this.docker.getImage(id).remove({ force });
    } catch (err) {
      error(this.name, "Failed to remove image", { id, error: (err as Error).message });
      throw err;
    }
  }

  async pruneImages(): Promise<Docker.PruneImagesInfo> {
    try {
      const result = await this.docker.pruneImages();
      info(this.name, "Pruned images", {
        spaceReclaimed: result.SpaceReclaimed,
        imagesDeleted: result.ImagesDeleted?.length || 0,
      });
      return result;
    } catch (err) {
      error(this.name, "Failed to prune images", { error: (err as Error).message });
      throw err;
    }
  }

  async checkImageExists(id: string): Promise<boolean> {
    try {
      await this.docker.getImage(id).inspect();
      return true;
    } catch (err) {
      const dockerErr = err as { statusCode?: number };
      if (dockerErr.statusCode === 404) {
        return false;
      }
      error(this.name, "Error checking image existence", { id, error: (err as Error).message });
      throw err;
    }
  }

  // PRIVATE HELPERS

  private buildAuthConfig(auth?: Partial<PullImageAuth>): AuthConfigObject | undefined {
    if (!auth?.username || !auth?.password || !auth?.registry) {
      return undefined;
    }

    return {
      username: auth.username,
      password: auth.password,
      serveraddress: auth.registry,
      auth: "", // Required by Docker API
    };
  }

  private async validateAuth(authconfig: AuthConfigObject, imageName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.docker.checkAuth(authconfig, err => {
        if (err) {
          error(this.name, "Authentication failed", {
            image: imageName,
            registry: authconfig.serveraddress,
            error: err.message,
          });
          return reject(new Error(`Authentication failed for ${authconfig.serveraddress}`));
        }
        info(this.name, "Authentication successful", {
          image: imageName,
          registry: authconfig.serveraddress,
        });
        resolve();
      });
    });
  }

  private isSignificantProgressEvent(status: string): boolean {
    // Only log meaningful status changes, not every progress tick
    const significantStatuses = ["Pulling fs layer", "Downloading", "Download complete", "Extracting", "Pull complete", "Already exists", "Digest:", "Status:"];

    return significantStatuses.some(s => status.includes(s));
  }
}
