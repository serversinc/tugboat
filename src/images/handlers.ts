import { Context } from "hono";
import { DockerService } from "../services/Docker";

export function createImageHandlers(dockerService: DockerService) {
  if (!dockerService) throw new Error("Docker service is required");

  async function list(ctx: Context) {
    try {
      const images = await dockerService.listImages();
      info("Image", "Listed images");
      return ctx.json(images);
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async function get(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const image = await dockerService.getImage(id);
      return ctx.json(image);
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async function pull(ctx: Context) {
    try {
      const options = (await ctx.req.json()) as { name: string };

      await dockerService.pullImage(options.name);

      info("Image", "Pulled image", { name: options.name });

      return ctx.json({ success: true, message: `image pulled: ${options.name}` });
    } catch (err) {
      return ctx.json({ success: false, error: (err as Error).message }, 500);
    }
  }

  async function remove(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await dockerService.removeImage(id);
      return ctx.json({ success: true, message: "image removed" });
    } catch (err) {
      return ctx.json({ success: false, error: (err as Error).message }, 500);
    }
  }

  async function prune(ctx: Context) {
    try {
      await dockerService.pruneImages();
      return ctx.json({ success: true, message: "images pruned" });
    } catch (err) {
      return ctx.json({ success: false, error: (err as Error).message }, 500);
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
