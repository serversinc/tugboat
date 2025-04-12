import { Context } from "hono";
import { DockerService } from "../services/Docker";
import { getTargetDirectory } from "../utils/path";

export class ImageController {
  private docker: DockerService;

  constructor(dockerService: DockerService) {
    if (!dockerService) {
      throw new Error("Docker service is required");
    }

    this.docker = dockerService;
  }

  /**
   * List active images
   * @param ctx
   * @returns
   */
  async list(ctx: Context) {
    try {
      console.log("Listing images");
      const images = await this.docker.listImages();
      return ctx.json(images);
    } catch (err) {
      console.log(err);
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Get a image by id
   * @param ctx
   * @returns
   */
  async get(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const image = await this.docker.getImage(id);
      return ctx.json(image);
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Create a new image
   * @param ctx
   * @returns
   */
  async create(ctx: Context) {
    try {
      const options = (await ctx.req.json()) as { name: string; tag: string };

      const targetDir = getTargetDirectory(options.name);
      const repoName = options.name.split("/").pop();
      const imageName = `${repoName}:${options.tag || "latest"}`;

      // Check if buildpacksio/pack image is available locally
      const packImage = await this.docker.getImage("buildpacksio/pack").catch(() => null);

      if (!packImage) {
        await this.docker.pullImage("buildpacksio/pack");
      }

      // Volume mappings
      const volumes = [
        {
          // Mount the Docker socket for container management
          from: "/var/run/docker.sock",
          to: "/var/run/docker.sock",
          mode: "rw", // Read/write permissions
        },
        {
          from: targetDir,
          to: "/workspace",
          mode: "rw",
        },
      ];

      // Run the `pack` builder as a Docker container
      const container = await this.docker.createContainer({
        Image: "buildpacksio/pack",
        Cmd: ["build", repoName!, "--builder", "heroku/builder:22", "--verbose", "--path", "/workspace"],
        Tty: true,
        WorkingDir: "/workspace",
        HostConfig: {
          Binds: volumes.map(vol => `${vol.from}:${vol.to}:${vol.mode}`),
          AutoRemove: true,
        },
      });

      console.log("Container created:", container.id);

      // Start the container
      await container.start();

      // Stream logs from the container
      const logs: string[] = [];
      const stream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
      });

      stream.on("data", chunk => {
        logs.push(chunk.toString());
        console.log(chunk.toString()); // Optionally log to the console
      });

      // Wait for the container to finish
      const exitCode = await container.wait();

      if (exitCode.StatusCode !== 0) {
        return ctx.json(
          {
            success: false,
            error: `Pack build failed with exit code ${exitCode.StatusCode}`,
            logs,
          },
          500
        );
      }

      return ctx.json({
        success: true,
        message: `Image ${imageName} built successfully`,
        logs,
      });
    } catch (err) {
      return ctx.json(
        {
          success: false,
          error: (err as Error).message,
        },
        500
      );
    }
  }

  /**
   * Pull an image
   * @param ctx
   * @returns
   */
  async pull(ctx: Context) {
    try {
      const options = (await ctx.req.json()) as { name: string };

      await this.docker.pullImage(options.name);

      return ctx.json({
        success: true,
        message: `image pulled: ${options.name}`,
      });
    } catch (err) {
      return ctx.json(
        {
          success: false,
          error: (err as Error).message,
        },
        500
      );
    }
  }

  /**
   * Remove a image
   * @param ctx
   * @returns
   */
  async remove(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await this.docker.removeImage(id);
      return ctx.json({
        success: true,
        message: "image removed",
      });
    } catch (err) {
      return ctx.json(
        {
          success: false,
          error: (err as Error).message,
        },
        500
      );
    }
  }

  /**
   * Prune images
   * @param ctx
   */
  async prune(ctx: Context) {
    try {
      await this.docker.pruneImages();
      return ctx.json({
        success: true,
        message: "images pruned",
      });
    } catch (err) {
      return ctx.json(
        {
          success: false,
          error: (err as Error).message,
        },
        500
      );
    }
  }
}
