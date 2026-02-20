import { ChildProcessByStdio, spawn } from "child_process";
import { error, info, warn } from "../utils/console";
import { httpService } from "./Http";
import { Readable } from "stream";
import { DockerService } from "./Docker";
import { ContainerInspectInfo } from "dockerode";

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

interface ContainerDetails {
  application_id: string | null;
  environment_id: string | null;
  deployment_id: string | null;
}

interface EventPayload {
  event: string;
  type: string;
  id: string;
  attributes: Record<string, unknown>;
}

type WatcherState = "stopped" | "starting" | "running" | "stopping";

export class WatcherService {
  public readonly name = "Watcher";

  private readonly docker: DockerService;
  private spawnedProcess: ChildProcessByStdio<null, Readable, Readable> | null = null;
  private buffer = "";
  private state: WatcherState = "stopped";

  private readonly maxBufferSize = 1024 * 1024; // 1MB max buffer
  private readonly initialRetryDelay = 5000;
  private readonly maxRetryDelay = 60000;
  private retryCount = 0;

  constructor(dockerService: DockerService) {
    this.docker = dockerService;
  }

  // Start watching the Docker events
  start(): void {
    if (this.state === "running" || this.state === "starting") {
      info(this.name, "Docker event watcher already running or starting");
      return;
    }

    this.state = "starting";

    try {
      this.spawnedProcess = spawn("docker", ["events", "--format", "{{json .}}"], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.spawnedProcess.stdout.on("data", chunk => this.handleChunk(chunk));

      this.spawnedProcess.stderr.on("data", data => {
        error(this.name, "Docker events stderr", { message: data.toString().trim() });
      });

      this.spawnedProcess.on("error", err => {
        error(this.name, "Failed to spawn docker events", { error: err.message });
        this.state = "stopped";
        this.scheduleRestart();
      });

      this.spawnedProcess.on("exit", (code, signal) => {
        error(this.name, "Docker events process exited", { code, signal });
        this.spawnedProcess = null;
        this.state = "stopped";
        this.scheduleRestart();
      });

      this.state = "running";
      this.retryCount = 0; // Reset retry count on successful start
      info(this.name, "Docker event watcher started successfully");
    } catch (err) {
      error(this.name, "Failed to start watcher", { error: (err as Error).message });
      this.state = "stopped";
      this.scheduleRestart();
    }
  }

  // Stop watching the Docker events
  stop(): void {
    if (this.state === "stopped" || this.state === "stopping") {
      return;
    }

    this.state = "stopping";
    info(this.name, "Stopping Docker event watcher");

    if (this.spawnedProcess) {
      this.spawnedProcess.kill("SIGTERM");

      // Force kill after timeout
      setTimeout(() => {
        if (this.spawnedProcess) {
          warn(this.name, "Force killing docker events process");
          this.spawnedProcess.kill("SIGKILL");
        }
      }, 5000);

      this.spawnedProcess = null;
    }

    this.buffer = "";
    this.state = "stopped";
  }

  // Restart the watcher
  restart(): void {
    info(this.name, "Restarting Docker event watcher");
    this.stop();
    // Small delay before restart
    setTimeout(() => this.start(), 1000);
  }

  // Cleanup on shutdown
  shutdown(): void {
    info(this.name, "Shutting down Docker event watcher");
    this.stop();
  }

  // Get current state
  getState(): WatcherState {
    return this.state;
  }

  // Schedule restart with exponential backoff
  private scheduleRestart(): void {
    const delay = Math.min(this.initialRetryDelay * Math.pow(2, this.retryCount), this.maxRetryDelay);

    this.retryCount++;

    info(this.name, "Scheduling restart", {
      delay,
      attempt: this.retryCount,
    });

    setTimeout(() => this.start(), delay);
  }

  // Handle raw stdout chunks (buffer + parse by line)
  private handleChunk(chunk: Buffer): void {
    this.buffer += chunk.toString();

    // Prevent buffer overflow
    if (this.buffer.length > this.maxBufferSize) {
      warn(this.name, "Buffer size exceeded, truncating", {
        size: this.buffer.length,
      });
      this.buffer = this.buffer.slice(-this.maxBufferSize / 2);
    }

    let index: number;
    while ((index = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, index).trim();
      this.buffer = this.buffer.slice(index + 1);

      if (!line) continue;

      try {
        const event = JSON.parse(line) as DockerEvent;
        // Don't await - process events asynchronously
        this.handleEvent(event).catch(err => {
          error(this.name, "Error handling event", {
            error: err.message,
            event: event.Action,
          });
        });
      } catch (err) {
        error(this.name, "Failed to parse Docker event", {
          error: (err as Error).message,
          raw: line.substring(0, 200), // Truncate long lines in logs
        });
      }
    }
  }

  // Handle parsed Docker event
  private async handleEvent(event: DockerEvent): Promise<void> {
    if (!this.shouldForward(event)) {
      return;
    }

    const payload: EventPayload = {
      event: event.Action,
      type: event.Type,
      id: event.Actor.ID,
      attributes: event.Actor.Attributes,
    };

    // Enrich with container details on creation
    if (event.Action === "create" && event.Type === "container") {
      try {
        const inspect = await this.docker.getContainer(event.Actor.ID);
        const environment = this.getDetailsFromEnv(inspect);
        const [image, tag] = this.parseImageTag(inspect.Config.Image);

        payload.attributes = {
          id: inspect.Id,
          name: inspect.Name.replace(/^\//, ""),
          image,
          tag,
          state: inspect.State.Status,
          created: inspect.Created,
          application_id: environment.application_id,
          environment_id: environment.environment_id,
          deployment_id: environment.deployment_id,
        };
      } catch (err) {
        error(this.name, "Failed to enrich event with container details", {
          error: (err as Error).message,
          containerId: event.Actor.ID,
        });
        // Continue forwarding even if enrichment fails
      }
    }

    // Use postSafe to avoid throwing on http failures
    const success = await httpService.postSafe({
      type: "docker_event",
      payload,
    });

    if (!success) {
      warn(this.name, "Failed to forward event", {
        action: event.Action,
        id: event.Actor.ID,
      });
    }
  }

  // Filter logic (customizable later)
  private shouldForward(event: DockerEvent): boolean {
    if (event.Type !== "container") {
      return false;
    }

    // Skip stop and kill events
    const skipActions = ["stop", "kill"];
    if (skipActions.includes(event.Action)) {
      return false;
    }

    return true;
  }

  // Parse image and tag, handling edge cases
  private parseImageTag(imageName: string): [string, string] {
    const lastColon = imageName.lastIndexOf(":");

    // No colon or colon is part of registry (e.g., localhost:5000/image)
    if (lastColon === -1 || imageName.indexOf("/") > lastColon) {
      return [imageName, "latest"];
    }

    const image = imageName.substring(0, lastColon);
    const tag = imageName.substring(lastColon + 1);

    return [image, tag || "latest"];
  }

  private getDetailsFromEnv(inspect: ContainerInspectInfo): ContainerDetails {
    const env = inspect.Config?.Env ?? [];

    const envMap = new Map<string, string>(
      env.map(entry => {
        const [key, ...rest] = entry.split("=");
        return [key, rest.join("=")] as [string, string];
      }),
    );

    return {
      application_id: envMap.get("CORE_APP_ID") ?? null,
      environment_id: envMap.get("CORE_ENV_ID") ?? null,
      deployment_id: envMap.get("CORE_DEPLOYMENT_ID") ?? null,
    };
  }
}
