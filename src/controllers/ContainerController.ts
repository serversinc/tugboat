import { Context } from "hono";
import { DockerService } from "../services/Docker";

export class ContainerController {
  private docker: DockerService;

  constructor(dockerService: DockerService) {
    if (!dockerService) {
      throw new Error("Docker service is required");
    }

    this.docker = dockerService;

    console.log("Container controller initialized");
  }

  async list(ctx: Context) {
    try {
      console.log("Listing containers");
      const containers = await this.docker.listContainers();
      return ctx.json(containers);
    } catch (err) {
      console.log(err);
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async start(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await this.docker.startContainer(id);
      return ctx.json({ message: "Container started" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async stop(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await this.docker.stopContainer(id);
      return ctx.json({ message: "Container stopped" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }
}
