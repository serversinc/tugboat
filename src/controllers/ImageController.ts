import { Context } from "hono";
import { DockerService } from "../services/Docker";

import Docker from "dockerode";

export class ImageController {
  private docker: DockerService;

  constructor(dockerService: DockerService) {
    if (!dockerService) {
      throw new Error("Docker service is required");
    }

    this.docker = dockerService;

    console.log("Image controller initialized");
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
   * Pull an image
   * @param ctx
   * @returns
   */
  async pull(ctx: Context) {
    try {
      const options = (await ctx.req.json()) as { name: string };

      await this.docker.pullImage(options.name);

      return ctx.json({
        message: `image pulled: ${options.name}`,
      });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
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
      return ctx.json({ message: "image removed" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Prune images
   * @param ctx
   */
  async prune(ctx: Context) {
    try {
      await this.docker.pruneImages();
      return ctx.json({ message: "images pruned" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }
}
