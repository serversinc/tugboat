"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatcherService = void 0;
const child_process_1 = require("child_process");
const console_1 = require("../utils/console");
const Http_1 = require("./Http");
class WatcherService {
    name = "Watcher";
    docker = null;
    spawnedProcess = null;
    buffer = "";
    retryDelay = 5000;
    constructor(dockerService) {
        this.docker = dockerService;
    }
    // Start watching the Docker events
    start() {
        if (this.spawnedProcess) {
            (0, console_1.info)("Watcher", "Docker event watcher already running");
            return;
        }
        (0, console_1.info)("Watcher", "Starting Docker event watcher...");
        this.spawnedProcess = (0, child_process_1.spawn)("docker", ["events", "--format", "{{json .}}"], {
            stdio: ["ignore", "pipe", "pipe"],
        });
        this.spawnedProcess.stdout.on("data", chunk => this.handleChunk(chunk));
        this.spawnedProcess.stderr.on("data", data => {
            (0, console_1.error)("Watcher", `Docker events stderr: ${data.toString().trim()}`);
        });
        this.spawnedProcess.on("error", err => {
            (0, console_1.error)("Watcher", `Failed to spawn docker events: ${err.message}`);
        });
        this.spawnedProcess.on("exit", code => {
            (0, console_1.error)("Watcher", `Docker events process exited with code ${code}`);
            this.spawnedProcess = null;
            // auto-restart after backoff
            setTimeout(() => this.start(), this.retryDelay);
        });
    }
    // Stop watching the Docker events
    stop() {
        if (!this.spawnedProcess)
            return;
        (0, console_1.info)("Watcher", "Stopping Docker event watcher...");
        this.spawnedProcess.kill();
        this.spawnedProcess = null;
    }
    // Restart the watcher
    restart() {
        (0, console_1.info)("Watcher", "Restarting Docker event watcher...");
        this.stop();
        this.start();
    }
    // Cleanup on shutdown
    shutdown() {
        (0, console_1.info)("Watcher", "Shutting down Docker event watcher...");
        this.stop();
    }
    // Handle raw stdout chunks (buffer + parse by line)
    handleChunk(chunk) {
        this.buffer += chunk.toString();
        let index;
        while ((index = this.buffer.indexOf("\n")) >= 0) {
            const line = this.buffer.slice(0, index).trim();
            this.buffer = this.buffer.slice(index + 1);
            if (!line)
                continue;
            try {
                const event = JSON.parse(line);
                this.handleEvent(event);
            }
            catch (err) {
                (0, console_1.error)("Watcher", `Failed to parse Docker event: ${err.message}`);
            }
        }
    }
    // Handle parsed Docker event
    async handleEvent(event) {
        if (!this.shouldForward(event))
            return;
        let payload = {
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
            await Http_1.httpService.post({
                type: "docker_event",
                payload,
            });
        }
        catch (err) {
            (0, console_1.error)("Watcher", `Failed to forward event: ${err.message}`);
        }
    }
    // Filter logic (customizable later)
    shouldForward(event) {
        if (event.Type !== "container")
            return false;
        if (event.Action === "stop" || event.Action === "kill")
            return false;
        return true;
    }
}
exports.WatcherService = WatcherService;
