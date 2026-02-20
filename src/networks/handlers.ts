import { Context } from "hono";
import { DockerService } from "../services/Docker";

export function createNetworkHandlers(dockerService: DockerService) {
  if (!dockerService) throw new Error("Docker service is required");

  async function list(ctx: Context) {
    try {
      const networks = await dockerService.docker.listNetworks();
      return ctx.json(networks);
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async function get(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const network = dockerService.docker.getNetwork(id);
      const data = await network.inspect();
      return ctx.json(data);
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 404);
    }
  }

  async function create(ctx: Context) {
    try {
      const options = await ctx.req.json();

      const network = await dockerService.docker.createNetwork({
        Name: options.name,
        Driver: options.drive || "bridge",
        CheckDuplicate: true,
        Internal: options.internal || false,
        Attachable: options.attachable || false,
        Ingress: options.ingress || false,
        EnableIPv6: options.enable_ipv6 || false,
        Labels: options.labels || {},
      });

      const data = await network.inspect();
      return ctx.json(data, 201);
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 400);
    }
  }

  async function remove(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const network = dockerService.docker.getNetwork(id);
      await network.remove();
      return ctx.json({ message: "Network removed." });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 400);
    }
  }

  return { list, get, create, remove };
}
