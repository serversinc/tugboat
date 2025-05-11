import { Context } from "hono";

import { DockerService } from "../services/Docker";

export class NetworkController {
  private docker: DockerService;

  constructor(dockerService: DockerService) {
    if (!dockerService) {
      throw new Error("Docker service is required");
    }

    this.docker = dockerService;
  }

  async list(ctx: Context) {
    try {
      const networks = await this.docker.docker.listNetworks();
      return ctx.json(networks);
    } catch (error: any) {
      return ctx.json({ error: error.message }, 500);
    }
  }

  async get(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const network = this.docker.docker.getNetwork(id);
      const data = await network.inspect();
      return ctx.json(data);
    } catch (error: any) {
      return ctx.json({ error: error.message }, 404);
    }
  }

  async create(ctx: Context) {
    try {
      const body = await ctx.req.json();
      const network = await this.docker.docker.createNetwork(body);
      const data = await network.inspect();
      return ctx.json(data, 201);
    } catch (error: any) {
      return ctx.json({ error: error.message }, 400);
    }
  }

  async remove(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const network = this.docker.docker.getNetwork(id);
      await network.remove();
      return ctx.json({ message: "Network removed." });
    } catch (error: any) {
      return ctx.json({ error: error.message }, 400);
    }
  }
}
