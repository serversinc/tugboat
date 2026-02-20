import { Context } from "hono";
import { DockerService } from "../services/Docker";
import { info } from "../utils/console";
import { handleError } from "../utils/error";

export function createNetworkHandlers(dockerService: DockerService) {
  if (!dockerService) throw new Error("Docker service is required");

  async function list(ctx: Context) {
    try {
      const networks = await dockerService.docker.listNetworks();
      info("Network", "Listed networks");
      return ctx.json(networks);
    } catch (err) {
      return handleError(ctx, err, "Network", "list networks");
    }
  }

  async function get(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const network = dockerService.docker.getNetwork(id);
      const data = await network.inspect();
      return ctx.json(data);
    } catch (err) {
      return handleError(ctx, err, "Network", "get network", { id: ctx.req.param("id") });
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
      info("Network", "Created network", { name: options.name });
      return ctx.json(data, 201);
    } catch (err) {
      return handleError(ctx, err, "Network", "create network");
    }
  }

  async function remove(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const network = dockerService.docker.getNetwork(id);
      await network.remove();
      info("Network", "Removed network", { id });
      return ctx.json({ success: true, message: "network removed", id });
    } catch (err) {
      return handleError(ctx, err, "Network", "remove network", { id: ctx.req.param("id") });
    }
  }

  return { list, get, create, remove };
}
