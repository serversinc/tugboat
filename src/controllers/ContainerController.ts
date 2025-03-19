import { Context } from "hono";
import { DockerService } from "../services/Docker";

import Docker from "dockerode";

export class ContainerController {
  private docker: DockerService;

  constructor(dockerService: DockerService) {
    if (!dockerService) {
      throw new Error("Docker service is required");
    }

    this.docker = dockerService;

    console.log("Container controller initialized");
  }

  /**
   * List active containers
   * @param ctx
   * @returns
   */
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

  /**
   * Get a container by id
   * @param ctx
   * @returns
   */
  async get(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const container = await this.docker.getContainer(id);
      return ctx.json(container);
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Create a container
   * @param ctx
   * @returns
   */
  async create(ctx: Context) {
    try {
      const options = ctx.req.json() as Docker.ContainerCreateOptions;
      const container = await this.docker.createContainer(options);
      return ctx.json(container);
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Remove a container
   * @param ctx
   * @returns
   */
  async remove(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await this.docker.removeContainer(id);
      return ctx.json({ message: "Container removed" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Restart a container
   * @param ctx
   * @returns
   */
  async restart(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await this.docker.restartContainer(id);
      return ctx.json({ message: "Container restarted" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Start a container
   * @param ctx
   * @returns
   */
  async start(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await this.docker.startContainer(id);
      return ctx.json({ message: "Container started" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Stop a container
   * @param ctx
   * @returns
   */
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
