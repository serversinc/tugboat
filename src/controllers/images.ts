import { Context } from "hono";
import { DockerService } from "../services/Docker";
import { info } from "../utils/console";
import { handleError } from "../utils/error";

interface PullOptions {
  name: string;
}

export function createImageHandlers(dockerService: DockerService) {
  if (!dockerService) throw new Error("Docker service is required");

  async function list(ctx: Context) {
    try {
      const images = await dockerService.listImages();
      info("Image", "Listed images");
      return ctx.json(images);
    } catch (err) {
      return handleError(ctx, err, "Image", "list images");
    }
  }

  async function get(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const image = await dockerService.getImage(id);
      return ctx.json(image);
    } catch (err) {
      return handleError(ctx, err, "Image", "get image", { id: ctx.req.param("id") });
    }
  }

  async function pull(ctx: Context) {
    try {
      const options = (await ctx.req.json()) as PullOptions;

      info("Image", "Pulling image", { name: options.name });
      await dockerService.pullImage(options.name);

      info("Image", "Pulled image", { name: options.name });

      return ctx.json({ success: true, message: "image pulled", image: { name: options.name } });
    } catch (err) {
      return handleError(ctx, err, "Image", "pull image");
    }
  }

  async function remove(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await dockerService.removeImage(id);
      return ctx.json({ success: true, message: "image removed" });
    } catch (err) {
      return handleError(ctx, err, "Image", "remove image", { id: ctx.req.param("id") });
    }
  }

  async function prune(ctx: Context) {
    try {
      await dockerService.pruneImages();
      return ctx.json({ success: true, message: "images pruned" });
    } catch (err) {
      return handleError(ctx, err, "Image", "prune images");
    }
  }

  return {
    list,
    get,
    pull,
    remove,
    prune,
  };
}
