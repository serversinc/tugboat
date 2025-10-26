import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";

import { ImageController } from "../controllers/ImageController";
import { ContainerController } from "../controllers/ContainerController";
import { createContainerSchema } from "../validators/Containers";
import { createImageSchema, pullImageSchema } from "../validators/Images";
import { GithubController } from "../controllers/GithubController";
import { NetworkController } from "../controllers/NetworkController";
import { ComposeController } from "../controllers/ComposeController";
import { createNetworkSchema } from "../validators/Networks";
import { info } from "../utils/console";

export class Application {
  private app: Hono;

  constructor(containerController: ContainerController, imageController: ImageController, githubController: GithubController, networkController: NetworkController, composeController: ComposeController) {
    this.app = new Hono();

    this.app.use(cors());

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
    this.app.post("/containers", zValidator("json", createContainerSchema), containerController.create.bind(containerController));
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
    this.app.post("/images", zValidator("json", createImageSchema), imageController.create.bind(imageController));
    this.app.get("/images/:id", imageController.get.bind(imageController));
    this.app.post("/images/pull", zValidator("json", pullImageSchema), imageController.pull.bind(imageController));
    this.app.delete("/images/:id", imageController.remove.bind(imageController));

    // Networks
    this.app.get("/networks", networkController.list.bind(networkController));
    this.app.get("/networks/:id", networkController.get.bind(networkController));
    this.app.post("/networks", zValidator("json", createNetworkSchema), networkController.create.bind(networkController));
    this.app.delete("/networks/:id", networkController.remove.bind(networkController));

    // Github
    this.app.post("/github/pull", githubController.pull.bind(githubController));

    // Compose
    this.app.post("/compose/start", composeController.start.bind(composeController));
    this.app.post("/compose/stop", composeController.stop.bind(composeController));
  }

  start() {
    serve(
      {
        port: process.env.TUGBOAT_PORT ? parseInt(process.env.TUGBOAT_PORT) : 3000,
        fetch: this.app.fetch.bind(this.app),
      },
      data => {
        info("Hono", `Server started on port ${data.port}`);
      }
    );
  }
}
