"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const node_server_1 = require("@hono/node-server");
const zod_validator_1 = require("@hono/zod-validator");
const Containers_1 = require("../validators/Containers");
const Images_1 = require("../validators/Images");
const Networks_1 = require("../validators/Networks");
const console_1 = require("../utils/console");
class Application {
    app;
    constructor(containerController, imageController, githubController, networkController, composeController) {
        this.app = new hono_1.Hono();
        this.app.use((0, cors_1.cors)());
        // Authentication middleware
        this.app.use("*", async (ctx, next) => {
            const path = ctx.req.path;
            // Logs endpoint checks auth from query params
            if (path.startsWith("/containers/") && path.endsWith("/logs")) {
                await next();
                return;
            }
            const authKey = process.env.TUGBOAT_SECRET_KEY;
            const requestKey = ctx.req.header("x-auth-key");
            if (!authKey || requestKey !== authKey) {
                return ctx.json({ error: "Unauthorized" }, 401);
            }
            await next();
        });
        // Containers
        this.app.get("/containers", containerController.list.bind(containerController));
        this.app.get("/containers/:id", containerController.get.bind(containerController));
        this.app.post("/containers", (0, zod_validator_1.zValidator)("json", Containers_1.createContainerSchema), containerController.create.bind(containerController));
        this.app.delete("/containers/:id", containerController.remove.bind(containerController));
        // Container actions
        this.app.post("/containers/:id/start", containerController.start.bind(containerController));
        this.app.post("/containers/:id/stop", containerController.stop.bind(containerController));
        this.app.post("/containers/:id/restart", containerController.restart.bind(containerController));
        this.app.post("/containers/:id/command", containerController.runCommand.bind(containerController));
        // Logs
        this.app.get("/containers/:id/logs", containerController.logs.bind(containerController));
        // Images
        this.app.get("/images", imageController.list.bind(imageController));
        this.app.post("/images", (0, zod_validator_1.zValidator)("json", Images_1.createImageSchema), imageController.create.bind(imageController));
        this.app.get("/images/:id", imageController.get.bind(imageController));
        this.app.post("/images/pull", (0, zod_validator_1.zValidator)("json", Images_1.pullImageSchema), imageController.pull.bind(imageController));
        this.app.delete("/images/:id", imageController.remove.bind(imageController));
        // Networks
        this.app.get("/networks", networkController.list.bind(networkController));
        this.app.get("/networks/:id", networkController.get.bind(networkController));
        this.app.post("/networks", (0, zod_validator_1.zValidator)("json", Networks_1.createNetworkSchema), networkController.create.bind(networkController));
        this.app.delete("/networks/:id", networkController.remove.bind(networkController));
        // Github
        this.app.post("/github/pull", githubController.pull.bind(githubController));
        // Compose
        this.app.post("/compose/start", composeController.start.bind(composeController));
        this.app.post("/compose/stop", composeController.stop.bind(composeController));
    }
    start() {
        (0, node_server_1.serve)({
            port: process.env.TUGBOAT_PORT ? parseInt(process.env.TUGBOAT_PORT) : 3000,
            fetch: this.app.fetch.bind(this.app),
        }, data => {
            (0, console_1.info)("Hono", `Server started on port ${data.port}`);
        });
    }
}
exports.Application = Application;
