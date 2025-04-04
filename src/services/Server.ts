import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";

import { ImageController } from "../controllers/ImageController";
import { ContainerController } from "../controllers/ContainerController";
import { createContainerSchema } from "../validators/Containers";
import { pullImageSchema } from "../validators/Images";

export class Application {
  private app: Hono;

  constructor(containerController: ContainerController, imageController: ImageController) {
    this.app = new Hono();

    // Containers
    this.app.get("/containers", containerController.list.bind(containerController));
    this.app.get("/containers/:id", containerController.get.bind(containerController));
    this.app.post("/containers", zValidator("json", createContainerSchema), containerController.create.bind(containerController));
    this.app.delete("/containers/:id", containerController.remove.bind(containerController));

    // Container actions
    this.app.post("/containers/:id/start", containerController.start.bind(containerController));
    this.app.post("/containers/:id/stop", containerController.stop.bind(containerController));
    this.app.post("/containers/:id/restart", containerController.restart.bind(containerController));

    // Images
    this.app.get("/images", imageController.list.bind(imageController));
    this.app.get("/images/:id", imageController.get.bind(imageController));
    this.app.post("/images/pull", zValidator("json", pullImageSchema), imageController.pull.bind(imageController));
    this.app.delete("/images/:id", imageController.remove.bind(imageController));
    this.app.get("/prune-images", imageController.list.bind(imageController));
  }

  start() {
    serve(
      {
        port: process.env.TUGBOAT_PORT ? parseInt(process.env.TUGBOAT_PORT) : 3000,
        fetch: this.app.fetch.bind(this.app),
      },
      info => {
        console.log(`Server listening on http://localhost:${info.port}`);
      }
    );
  }
}
