import { Hono } from "hono";
import { ContainerController } from "../controllers/ContainerController";
import { serve } from "@hono/node-server";

export class Application {
  private app: Hono;

  constructor(containerController: ContainerController) {
    this.app = new Hono();

    this.app.get("/containers", containerController.list.bind(containerController));
    this.app.post("/containers/:id/start", containerController.start.bind(containerController));
    this.app.post("/containers/:id/stop", containerController.stop.bind(containerController));
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
