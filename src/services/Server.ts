import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";

import { ImageController } from "../controllers/ImageController";
import { createContainerHandlers } from "../containers/handlers";
import { createContainerSchema } from "../validators/Containers";
import { pullImageSchema } from "../validators/Images";
import { NetworkController } from "../controllers/NetworkController";
import { createNetworkSchema } from "../validators/Networks";
import { info } from "../utils/console";

export class Application {
  private app: Hono;

  // Accept a plain containerHandlers object from the composition root
  constructor(containerHandlers: any, imageController: ImageController, networkController: NetworkController) {
    this.app = new Hono();

    this.app.use(cors());

    // Authentication middleware
    this.app.use("*", async (ctx, next) => {
      const path = ctx.req.path;

      const authKey = process.env.TUGBOAT_SECRET_KEY;
      const requestKey = ctx.req.header("x-auth-key");

      if (!authKey || requestKey !== authKey) {
        return ctx.json({ error: "Unauthorized" }, 401);
      }

      await next();
    });

    // Containers (containerHandlers is a plain object of functions)
    this.app.get("/containers", containerHandlers.list);
    this.app.get("/containers/:id", containerHandlers.get);
    this.app.post("/containers", zValidator("json", createContainerSchema), containerHandlers.create);
    this.app.delete("/containers/:id", containerHandlers.remove);

    // Container actions
    this.app.post("/containers/:id/start", containerHandlers.start);
    this.app.post("/containers/:id/stop", containerHandlers.stop);
    this.app.post("/containers/:id/restart", containerHandlers.restart);
    this.app.post("/containers/:id/command", containerHandlers.runCommand);

    // Images
    this.app.get("/images", imageController.list.bind(imageController));
    this.app.get("/images/:id", imageController.get.bind(imageController));
    this.app.post("/images/pull", zValidator("json", pullImageSchema), imageController.pull.bind(imageController));
    this.app.delete("/images/:id", imageController.remove.bind(imageController));

    // Networks
    this.app.get("/networks", networkController.list.bind(networkController));
    this.app.get("/networks/:id", networkController.get.bind(networkController));
    this.app.post("/networks", zValidator("json", createNetworkSchema), networkController.create.bind(networkController));
    this.app.delete("/networks/:id", networkController.remove.bind(networkController));
  }

  start() {
    serve(
      {
        port: process.env.TUGBOAT_PORT ? parseInt(process.env.TUGBOAT_PORT) : 3000,
        fetch: this.app.fetch.bind(this.app),
      },
      data => {
        info("Hono", `Server started on port ${data.port}`);
      },
    );
  }
}
