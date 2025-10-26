"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkController = void 0;
class NetworkController {
    docker;
    constructor(dockerService) {
        if (!dockerService) {
            throw new Error("Docker service is required");
        }
        this.docker = dockerService;
    }
    async list(ctx) {
        try {
            const networks = await this.docker.docker.listNetworks();
            return ctx.json(networks);
        }
        catch (error) {
            return ctx.json({ error: error.message }, 500);
        }
    }
    async get(ctx) {
        try {
            const id = ctx.req.param("id");
            const network = this.docker.docker.getNetwork(id);
            const data = await network.inspect();
            return ctx.json(data);
        }
        catch (error) {
            return ctx.json({ error: error.message }, 404);
        }
    }
    async create(ctx) {
        try {
            const options = await ctx.req.json();
            const network = await this.docker.docker.createNetwork({
                Name: options.name,
                Driver: options.drive || "bridge",
                CheckDuplicate: true,
                Internal: options.internal || false,
                Attachable: options.attachable || false,
                Ingress: options.ingress || false,
                EnableIPv6: options.enable_ipv6 || false,
                Labels: options.labels || {}
            });
            const data = await network.inspect();
            return ctx.json(data, 201);
        }
        catch (error) {
            return ctx.json({ error: error.message }, 400);
        }
    }
    async remove(ctx) {
        try {
            const id = ctx.req.param("id");
            const network = this.docker.docker.getNetwork(id);
            await network.remove();
            return ctx.json({ message: "Network removed." });
        }
        catch (error) {
            return ctx.json({ error: error.message }, 400);
        }
    }
}
exports.NetworkController = NetworkController;
