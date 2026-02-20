import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";

import { createContainerHandlers } from "../containers/handlers";
import { createImageHandlers } from "../images/handlers";
import { createContainerSchema } from "../validators/Containers";
import { pullImageSchema } from "../validators/Images";
import { createNetworkHandlers } from "../networks/handlers";
import { createNetworkSchema } from "../validators/Networks";
import { info } from "../utils/console";

export class Application {
  private app: Hono;

  // Accept plain handler objects from the composition root
  constructor(containerHandlers: any, imageHandlers: any, networkHandlers: any) {
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
    this.app.get("/images", imageHandlers.list);
    this.app.get("/images/:id", imageHandlers.get);
    this.app.post("/images/pull", zValidator("json", pullImageSchema), imageHandlers.pull);
    this.app.delete("/images/:id", imageHandlers.remove);

    // Networks
    this.app.get("/networks", networkHandlers.list);
    this.app.get("/networks/:id", networkHandlers.get);
    this.app.post("/networks", zValidator("json", createNetworkSchema), networkHandlers.create);
    this.app.delete("/networks/:id", networkHandlers.remove);
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
