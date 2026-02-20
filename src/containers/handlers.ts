import { Context } from "hono";
import { PassThrough } from "stream";
import { streamSSE } from "hono/streaming";

import { demultiplexDockerStream, stripAnsiCodes } from "../utils/transformers";
import { DockerService } from "../services/Docker";

export function createContainerHandlers(dockerService: DockerService) {
  if (!dockerService) throw new Error("Docker service is required");

  async function list(ctx: Context) {
    try {
      const containers = await dockerService.listContainers();
      return ctx.json(containers);
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async function get(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const container = await dockerService.getContainer(id);
      info("Container", "Fetched container", { id });
      return ctx.json(container);
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async function create(ctx: Context) {
    try {
      const options = await ctx.req.json();

      // Check if image exists
      const imageExists = await dockerService.checkImageExists(options.image);

      if (!imageExists || options.pullImage) {
        await dockerService.pullImage(options.image, {
          username: options.auth?.username,
          password: options.auth?.password,
          registry: options.auth?.registry,
        });
      }

      const networks = options.networks || [];
      const EndpointsConfig = networks.reduce((acc: Record<string, any>, net: string) => {
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
      }

      const containerInfo = await dockerService.getContainer(container.id);
      info("Container", "Created container", { id: container.id, name: options.name });

      return ctx.json({
        success: true,
        message: `Container ${containerInfo.Name} created successfully`,
        container: containerInfo,
      });
    } catch (err) {
      return ctx.json({ success: false, error: (err as Error).message }, 500);
    }
  }

  async function remove(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await dockerService.removeContainer(id);
      info("Container", "Removed container", { id });
      return ctx.json({ message: "Container removed" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async function restart(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await dockerService.restartContainer(id);
      info("Container", "Restarted container", { id });
      return ctx.json({ message: "Container restarted" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async function start(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await dockerService.startContainer(id);
      info("Container", "Started container", { id });
      return ctx.json({ message: "Container started" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async function stop(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await dockerService.stopContainer(id);
      info("Container", "Stopped container", { id });
      return ctx.json({ message: "Container stopped" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async function logs(ctx: Context) {
    try {
      const id = ctx.req.param("id");

      // Check for x-auth-key query parameter
      const authKey = ctx.req.query("x-auth-key");
      const tail = ctx.req.query("tail") || 200;
      const requestKey = process.env.TUGBOAT_SECRET_KEY;

      if (!authKey || requestKey !== authKey) {
        return ctx.json({ error: "Unauthorized" }, 401);
      }

      const container = dockerService.docker.getContainer(id);

      if (!container) {
        return ctx.json({ error: "Container not found" }, 404);
      }

      const logs = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        timestamps: false,
        tail: Number(tail),
      });

      const stdout = new PassThrough();
      const stderr = new PassThrough();

      dockerService.docker.modem.demuxStream(logs, stdout, stderr);

      const decoder = new TextDecoder();

      return streamSSE(ctx, async stream => {
        const stdoutPromise = (async () => {
          for await (const chunk of stdout) {
            const message = decoder.decode(chunk);
            const clean = stripAnsiCodes(message);
            await stream.writeSSE({ data: `[stdout] ${clean}` });
          }
        })();

        const stderrPromise = (async () => {
          for await (const chunk of stderr) {
            const message = decoder.decode(chunk);
            const clean = stripAnsiCodes(message);
            await stream.writeSSE({ data: `[stderr] ${clean}` });
          }
        })();

        await Promise.race([stdoutPromise, stderrPromise]);
      });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async function runCommand(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const { command } = await ctx.req.json<{ command: string }>();

      if (!command) {
        return ctx.json({ error: "Command is required" }, 400);
      }

      const container = dockerService.docker.getContainer(id);

      if (!container) {
        return ctx.json({ error: "Container not found" }, 404);
      }

      const exec = await container.exec({
        Cmd: command.split(" "),
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

      let cleanStdout = stripAnsiCodes(stdout).trim();
      let cleanStderr = stripAnsiCodes(stderr).trim();

      if (cleanStdout.includes("\n")) {
        cleanStdout = cleanStdout
          .split("\n")
          .map(line => line.trim())
          .join(" ");
      }

      if (cleanStderr.includes("\n")) {
        cleanStderr = cleanStderr
          .split("\n")
          .map(line => line.trim())
          .join(" ");
      }

      return ctx.json({
        success: true,
        message: "Command executed successfully",
        output: { stdout: cleanStdout, stderr: cleanStderr },
      });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
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
    logs,
    runCommand,
  };
}
