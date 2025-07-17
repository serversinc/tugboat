import { Context } from "hono";
import { streamSSE } from "hono/streaming";

import { DockerService } from "../services/Docker";
import { demultiplexDockerStream, stripAnsiCodes } from "../utils/transformers";
import { PassThrough } from "stream";
import { parsePortString } from "../utils/ports";
import { httpService } from "../services/HttpService";

export class ContainerController {
  private docker: DockerService;

  constructor(dockerService: DockerService) {
    if (!dockerService) {
      throw new Error("Docker service is required");
    }

    this.docker = dockerService;
  }

  /**
   * List active containers
   * @param ctx
   * @returns
   */
  async list(ctx: Context) {
    try {
      const containers = await this.docker.listContainers();
      return ctx.json(containers);
    } catch (err) {
      console.log(err);
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Get a container by id
   * @param ctx
   * @returns
   */
  async get(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const container = await this.docker.getContainer(id);
      return ctx.json(container);
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Create a container
   * @param ctx
   * @returns
   */
  async create(ctx: Context) {
    try {
      // createContainerSchema
      const options = await ctx.req.json();

      console.log("Creating container with options:", options);

      // Check if image exists
      const imageExists = await this.docker.checkImageExists(options.image);

      if (!imageExists) {
        await this.docker.pullImage(options.image, {
          username: options.auth?.username,
          password: options.auth?.password,
          registry: options.auth?.registry,
        });
      }

      const ports = parsePortString(options.ports);

      const container = await this.docker.createContainer({
        name: options.name,
        Image: options.image,
        Env: options.environment,
        Labels: options.labels,
        ExposedPorts: ports.ExposedPorts,
        HostConfig: {
          Binds: options.volumes ?? [],
          PortBindings: ports.PortBindings,
          NetworkMode: options.networks?.[0] || "tugboat",
        },
        Cmd: options.command,
        NetworkingConfig: {
          EndpointsConfig: {
            [options.networks?.[0] || "tugboat"]: {
              Aliases: [options.name],
            },
          },
        },
        Entrypoint: options.entrypoint,
        WorkingDir: options.workingdir,
      });

      if (options.start) {
        await this.docker.startContainer(container.id);
      }

      const containerInfo = await this.docker.getContainer(container.id);

      if (options['rolling-deploy'] && options['rolling-deploy'] === true) {
        console.log("Triggering rolling deploy for container:", containerInfo.Name);
        await httpService.post({
          type: "rolling_deploy",
          container: containerInfo,
        });
      }

      console.log("Container created successfully:", containerInfo.Name);
      return ctx.json({
        success: true,
        message: `Container ${containerInfo.Name} created successfully`,
        container: containerInfo,
      });
    } catch (err) {
      console.log(err);
      return ctx.json(
        {
          success: false,
          error: (err as Error).message,
        },
        500
      );
    }
  }

  /**
   * Remove a container
   * @param ctx
   * @returns
   */
  async remove(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await this.docker.removeContainer(id);
      return ctx.json({ message: "Container removed" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Restart a container
   * @param ctx
   * @returns
   */
  async restart(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await this.docker.restartContainer(id);
      return ctx.json({ message: "Container restarted" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Start a container
   * @param ctx
   * @returns
   */
  async start(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await this.docker.startContainer(id);
      return ctx.json({ message: "Container started" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Stop a container
   * @param ctx
   * @returns
   */
  async stop(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      await this.docker.stopContainer(id);
      return ctx.json({ message: "Container stopped" });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  /**
   * Stream logs from a container
   */
  async logs(ctx: Context) {
    try {
      const id = ctx.req.param("id");

      // Check for x-auth-key query parameter
      const authKey = ctx.req.query("x-auth-key");
      const requestKey = process.env.TUGBOAT_SECRET_KEY;

      if (!authKey || requestKey !== authKey) {
        return ctx.json({ error: "Unauthorized" }, 401);
      }

      const container = this.docker.docker.getContainer(id);

      if (!container) {
        return ctx.json({ error: "Container not found" }, 404);
      }

      const logs = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        since: 0,
        timestamps: false,
      });

      // Create two clean output streams
      const stdout = new PassThrough();
      const stderr = new PassThrough();

      // Demux the stream
      this.docker.docker.modem.demuxStream(logs, stdout, stderr);

      const decoder = new TextDecoder();

      return streamSSE(ctx, async stream => {
        for await (const chunk of stdout) {
          const message = decoder.decode(chunk);
          const clean = stripAnsiCodes(message);
          await stream.writeSSE({ data: `[stdout] ${clean}` });
        }

        for await (const chunk of stderr) {
          const message = decoder.decode(chunk);
          const clean = stripAnsiCodes(message);
          await stream.writeSSE({ data: `[stderr] ${clean}` });
        }
      });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }

  async runCommand(ctx: Context) {
    try {
      const id = ctx.req.param("id");
      const { command } = await ctx.req.json<{ command: string }>();

      if (!command) {
        return ctx.json({ error: "Command is required" }, 400);
      }

      const container = this.docker.docker.getContainer(id);

      if (!container) {
        return ctx.json({ error: "Container not found" }, 404);
      }

      const exec = await container.exec({
        Cmd: command.split(" "),
        AttachStdout: true,
        AttachStderr: true,
      });

      // Run the exec command,
      const stream = await exec.start({
        hijack: true,
        stdin: false,
      });

      // Collect all chunks first
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      // Combine all chunks
      const buffer = Buffer.concat(chunks);

      // Demultiplex the Docker stream
      const { stdout, stderr } = demultiplexDockerStream(buffer);

      // Clean up the output
      let cleanStdout = stripAnsiCodes(stdout).trim();
      let cleanStderr = stripAnsiCodes(stderr).trim();

      // Detect if either output has \n in or \r\n and return as a single line
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

      // Return the output as a JSON response
      return ctx.json({
        success: true,
        message: "Command executed successfully",
        output: {
          stdout: cleanStdout,
          stderr: cleanStderr,
        },
      });
    } catch (err) {
      return ctx.json({ error: (err as Error).message }, 500);
    }
  }
}
