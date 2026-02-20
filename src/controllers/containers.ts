import { Context } from "hono";

import { demultiplexDockerStream, stripAnsiCodes } from "../utils/transformers";
import { DockerService } from "../services/Docker";
import { info, error as logError } from "../utils/console";

interface CreateContainerOptions {
  name: string;
  image: string;
  environment?: string[];
  labels?: Record<string, string>;
  exposedPorts?: Record<string, object>;
  hostConfig?: any;
  command?: string[];
  networks?: string[];
  entrypoint?: string[];
  workingdir?: string;
  start?: boolean;
  pullImage?: boolean;
  auth?: {
    username?: string;
    password?: string;
    registry?: string;
  };
}

interface CommandRequest {
  command: string | string[];
}

export function createContainerHandlers(dockerService: DockerService) {
  if (!dockerService) throw new Error("Docker service is required");

  // Centralized error handler
  function handleError(ctx: Context, err: unknown, operation: string, meta?: Record<string, unknown>) {
    const error = err as Error;
    logError("Container", `Failed to ${operation}`, { error: error.message, ...meta });
    
    const statusCode = error.message.includes("not found") ? 404 : 500;
    
    return ctx.json({ error: error.message }, statusCode);
  }

  async function list(ctx: Context) {
    try {
      const containers = await dockerService.listContainers();
      return ctx.json(containers);
    } catch (err) {
      return handleError(ctx, err, "list containers");
    }
  }

  async function get(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const container = await dockerService.getContainer(id);
      info("Container", "Fetched container", { id });
      return ctx.json(container);
    } catch (err) {
      return handleError(ctx, err, "get container", { id: ctx.req.param("id") });
    }
  }

  async function create(ctx: Context) {
    try {
      const options = await ctx.req.json<CreateContainerOptions>();

      const imageExists = await dockerService.checkImageExists(options.image);

      if (!imageExists || options.pullImage) {
        info("Container", "Pulling image", { image: options.image });
        await dockerService.pullImage(options.image, {
          username: options.auth?.username,
          password: options.auth?.password,
          registry: options.auth?.registry,
        });
      }

      const networks = options.networks || [];
      const EndpointsConfig = networks.reduce((acc: Record<string, { Aliases: string[] }>, net: string) => {
        if (!["host", "bridge", "none"].includes(net)) {
          acc[net] = { Aliases: [options.name] };
        }
        return acc;
      }, {});

      const container = await dockerService.createContainer({
        name: options.name,
        Image: options.image,
        Env: options.environment,
        Labels: options.labels,
        ExposedPorts: options.exposedPorts,
        HostConfig: options.hostConfig,
        Cmd: options.command,
        NetworkingConfig: {
          EndpointsConfig,
        },
        Entrypoint: options.entrypoint,
        WorkingDir: options.workingdir,
      });

      if (options.start) {
        await dockerService.startContainer(container.id);
        info("Container", "Created and started container", { id: container.id, name: options.name });
      } else {
        info("Container", "Created container", { id: container.id, name: options.name });
      }

      const containerInfo = await dockerService.getContainer(container.id);

      return ctx.json({
        success: true,
        message: "container created",
        container: containerInfo,
        containerName: containerInfo.Name,
      });
    } catch (err) {
      return handleError(ctx, err, "create container");
    }
  }

  async function remove(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await dockerService.removeContainer(id);
      info("Container", "Removed container", { id });
      return ctx.json({ success: true, message: "container removed", id });
    } catch (err) {
      return handleError(ctx, err, "remove container", { id: ctx.req.param("id") });
    }
  }

  async function restart(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await dockerService.restartContainer(id);
      info("Container", "Restarted container", { id });
      return ctx.json({ success: true, message: "container restarted", id });
    } catch (err) {
      return handleError(ctx, err, "restart container", { id: ctx.req.param("id") });
    }
  }

  async function start(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await dockerService.startContainer(id);
      info("Container", "Started container", { id });
      return ctx.json({ success: true, message: "container started", id });
    } catch (err) {
      return handleError(ctx, err, "start container", { id: ctx.req.param("id") });
    }
  }

  async function stop(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await dockerService.stopContainer(id);
      info("Container", "Stopped container", { id });
      return ctx.json({ success: true, message: "container stopped", id });
    } catch (err) {
      return handleError(ctx, err, "stop container", { id: ctx.req.param("id") });
    }
  }

  async function runCommand(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const { command } = await ctx.req.json<CommandRequest>();

      const container = dockerService.docker.getContainer(id);

      // Better command parsing - handle both string and array
      const cmdArray = Array.isArray(command) ? command : ["/bin/sh", "-c", command];

      const exec = await container.exec({
        Cmd: cmdArray,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ hijack: true, stdin: false });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const buffer = Buffer.concat(chunks);
      const { stdout, stderr } = demultiplexDockerStream(buffer);

      const cleanStdout = stripAnsiCodes(stdout).trim();
      const cleanStderr = stripAnsiCodes(stderr).trim();

      info("Container", "Executed command", { id, command });

      return ctx.json({
        success: true,
        message: "command executed",
        command: Array.isArray(command) ? command.join(" ") : command,
        output: { stdout: cleanStdout, stderr: cleanStderr },
      });
    } catch (err) {
      return handleError(ctx, err, "run command", { id: ctx.req.param("id") });
    }
  }

  return {
    list,
    get,
    create,
    remove,
    restart,
    start,
    stop,
    runCommand,
  };
}