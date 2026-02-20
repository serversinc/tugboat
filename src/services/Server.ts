import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";

import { createContainerSchema } from "../validators/Containers";
import { pullImageSchema } from "../validators/Images";
import { createNetworkSchema } from "../validators/Networks";
import { info } from "../utils/console";

export function startServer(containerHandlers: any, imageHandlers: any, networkHandlers: any, port?: number) {
  const app = new Hono();

  app.use(cors());

  // Authentication middleware
  app.use("*", async (ctx, next) => {
    const path = ctx.req.path;

    const authKey = process.env.TUGBOAT_SECRET_KEY;
    const requestKey = ctx.req.header("x-auth-key");

    if (!authKey || requestKey !== authKey) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    await next();
  });

  // Request ID middleware
  app.use("*", async (ctx, next) => {
    const requestId = ctx.req.header("x-request-id") || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // attach to context store for access in handlers
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { runWithRequestContext } = require("../utils/requestContext");
    runWithRequestContext({ requestId }, () => {});
    // store request-id in Hono request context for handlers that read it
    // Hono's ctx.req doesn't have a typed set function for custom keys, use ctx.set
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ctx.set("request-id", requestId);
    await next();
  });

  // Containers (containerHandlers is a plain object of functions)
  app.get("/containers", containerHandlers.list);
  app.get("/containers/:id", containerHandlers.get);
  app.post("/containers", zValidator("json", createContainerSchema), containerHandlers.create);
  app.delete("/containers/:id", containerHandlers.remove);

  // Container actions
  app.post("/containers/:id/start", containerHandlers.start);
  app.post("/containers/:id/stop", containerHandlers.stop);
  app.post("/containers/:id/restart", containerHandlers.restart);
  app.post("/containers/:id/command", containerHandlers.runCommand);

  // Images
  app.get("/images", imageHandlers.list);
  app.get("/images/:id", imageHandlers.get);
  app.post("/images/pull", zValidator("json", pullImageSchema), imageHandlers.pull);
  app.delete("/images/:id", imageHandlers.remove);

  // Networks
  app.get("/networks", networkHandlers.list);
  app.get("/networks/:id", networkHandlers.get);
  app.post("/networks", zValidator("json", createNetworkSchema), networkHandlers.create);
  app.delete("/networks/:id", networkHandlers.remove);

  serve(
    {
      port: port || (process.env.TUGBOAT_PORT ? parseInt(process.env.TUGBOAT_PORT) : 3000),
      fetch: app.fetch.bind(app),
    },
    data => {
      info("Hono", "Server started", { port: data.port });
    },
  );
}
