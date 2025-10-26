import { ChildProcessByStdio, spawn } from "child_process";
import { error, info } from "../utils/console";
import { httpService } from "./Http";
import { Readable } from "stream";
import { DockerService } from "./Docker";

export class WatcherService {
  public readonly name = "Watcher";

  private docker: DockerService = null as unknown as DockerService;
  private spawnedProcess: ChildProcessByStdio<null, Readable, Readable> | null = null;
  private buffer = "";
  private retryDelay = 5000;

  constructor(dockerService: DockerService) {
    this.docker = dockerService;
  }

  // Start watching the Docker events
  start() {
    if (this.spawnedProcess) {
      info("Watcher", "Docker event watcher already running");
      return;
    }

    info("Watcher", "Starting Docker event watcher...");

    this.spawnedProcess = spawn("docker", ["events", "--format", "{{json .}}"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.spawnedProcess.stdout.on("data", chunk => this.handleChunk(chunk));
    this.spawnedProcess.stderr.on("data", data => {
      error("Watcher", `Docker events stderr: ${data.toString().trim()}`);
    });

    this.spawnedProcess.on("error", err => {
      error("Watcher", `Failed to spawn docker events: ${err.message}`);
    });

    this.spawnedProcess.on("exit", code => {
      error("Watcher", `Docker events process exited with code ${code}`);
      this.spawnedProcess = null;

      // auto-restart after backoff
      setTimeout(() => this.start(), this.retryDelay);
    });
  }

  // Stop watching the Docker events
  stop() {
    if (!this.spawnedProcess) return;

    info("Watcher", "Stopping Docker event watcher...");
    this.spawnedProcess.kill();
    this.spawnedProcess = null;
  }

  // Restart the watcher
  restart() {
    info("Watcher", "Restarting Docker event watcher...");
    this.stop();
    this.start();
  }

  // Cleanup on shutdown
  shutdown() {
    info("Watcher", "Shutting down Docker event watcher...");
    this.stop();
  }

  // Handle raw stdout chunks (buffer + parse by line)
  private handleChunk(chunk: Buffer) {
    this.buffer += chunk.toString();
    let index;
    while ((index = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, index).trim();
      this.buffer = this.buffer.slice(index + 1);
      if (!line) continue;

      try {
        const event = JSON.parse(line) as DockerEvent;
        this.handleEvent(event);
      } catch (err) {
        error("Watcher", `Failed to parse Docker event: ${(err as Error).message}`);
      }
    }
  }

  // Handle parsed Docker event
  private async handleEvent(event: DockerEvent) {
    if (!this.shouldForward(event)) return;

    let payload: Record<string, any> = {
      event: event.Action,
      type: event.Type,
      id: event.Actor.ID,
      attributes: event.Actor.Attributes,
    };

    // Enrich with container details on creation
    if (event.Action === "create") {
      const inspect = await this.docker.getContainer(event.Actor.ID);

      const ports = inspect.NetworkSettings.Ports
        ? Object.entries(inspect.NetworkSettings.Ports).map(([port, mappings]) => ({
            port,
            mappings: mappings ? mappings.map(m => ({ hostIp: m.HostIp, hostPort: m.HostPort })) : [],
          }))
        : null;

      const environment = inspect.Config.Env
        ? inspect.Config.Env.map(env => {
            const [key, ...rest] = env.split("=");
            return { key, value: rest.join("=") };
          })
        : null;

      const exposed_ports = inspect.Config.ExposedPorts ? Object.keys(inspect.Config.ExposedPorts) : null;

      payload["attributes"] = {
        id: inspect.Id,
        image: inspect.Config.Image.split(":")[0],
        image_tag: inspect.Config.Image.split(":")[1] || "latest",
        name: inspect.Name.replace(/^\//, ""),
        state: inspect.State.Status,
        labels: inspect.Config.Labels || null,
        mounts: inspect.Mounts || null,
        command: inspect.Config.Cmd || null,
        volumes: inspect.Config.Volumes || null,
        exposed_ports: exposed_ports || null,
        ports: ports,
        environment: environment,
        created: inspect.Created,
        user: inspect.Config.User || null,
        entrypoint: inspect.Config.Entrypoint || null,
        networks: inspect.NetworkSettings.Networks || null,
        network_mode: inspect.HostConfig.NetworkMode || null,
        restart_policy: inspect.HostConfig.RestartPolicy || null,
        application_id: inspect.Config.Labels ? inspect.Config.Labels["com.serversinc.app_id"] || null : null,
      };
    }

    try {
      await httpService.post({
        type: "docker_event",
        payload,
      });
    } catch (err) {
      error("Watcher", `Failed to forward event: ${(err as Error).message}`);
    }
  }

  // Filter logic (customizable later)
  private shouldForward(event: DockerEvent): boolean {
    if (event.Type !== "container") return false;
    if (event.Action === "stop" || event.Action === "kill") return false;
    return true;
  }
}

interface DockerEvent {
  Type: "container" | "image" | "volume" | "network" | "plugin" | string;
  Action: string;
  Actor: {
    ID: string;
    Attributes: Record<string, string>;
  };
  time: number;
  timeNano: number;
  scope?: "local" | "swarm";
  status?: string;
}
