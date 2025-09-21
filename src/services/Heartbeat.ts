import os from "os";
import { execSync } from "child_process";
import { Container } from "dockerode";
import { httpService } from "./Http";
import { DockerService } from "./Docker";
import { info, warn, error } from "../utils/console";

export class HeartbeatService {
  public readonly name = "Heartbeat";

  private aliveInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  private docker: DockerService = null as unknown as DockerService;
  private defaultIface: string | null = null;

  private lastNetStats: { rx: number; tx: number } | null = null;

  constructor(dockerService: DockerService) {
    if (!process.env.TUGBOAT_PHONE_HOME_URL) {
      warn(this.name, "TUGBOAT_PHONE_HOME_URL is not set. Heartbeat service will not start.");
      return;
    }

    this.docker = dockerService;
    this.defaultIface = this.getDefaultInterface();
    info(this.name, `Initialized. Tracking interface: ${this.defaultIface ?? "none"}`);
  }

  start(): void {

    if(!this.docker) return;

    if (this.aliveInterval || this.metricsInterval) {
      warn(this.name, "Service is already running.");
      return;
    }

    // Send alive heartbeat every 90 seconds
    this.aliveInterval = setInterval(() => {
      this.sendAliveHeartbeat();
    }, 60_000);

    // Send full metrics every 5 minutes
    this.metricsInterval = setInterval(() => {
      this.sendMetricsHeartbeat();
    }, 300_000);

    // Kick off immediately
    this.sendAliveHeartbeat();
    this.sendMetricsHeartbeat();

    info(this.name, "Service started.");
  }

  stop(): void {
    if (this.aliveInterval) clearInterval(this.aliveInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    this.aliveInterval = null;
    this.metricsInterval = null;
    info(this.name, "Service stopped.");
  }

  private async sendAliveHeartbeat(): Promise<void> {
    try {
      await httpService.post({ type: "alive" });
      info(this.name, "Sent alive heartbeat.");
    } catch (err) {
      error(this.name, `Alive heartbeat failed: ${(err as Error).message}`);
    }
  }

  private async sendMetricsHeartbeat(): Promise<void> {
    try {
      const containers = await this.getContainers();
      const usage = await this.getUsage();
      const disk = this.getDiskUsage();
      const network = this.getNetworkUsage();

      await httpService.post({
        type: "metrics",
        containers,
        usage,
        disk,
        network,
      });

      info(this.name, "Sent metrics heartbeat.");
    } catch (err) {
      error(this.name, `Metrics heartbeat failed: ${(err as Error).message}`);
    }
  }

  private async getContainers(): Promise<Container[]> {
    return this.docker.listContainers();
  }

  private getDiskUsage() {
    const output = execSync("df -h --output=source,fstype,size,used,avail,pcent,target -x tmpfs -x devtmpfs").toString();
    const lines = output.trim().split("\n");
    const headers = lines[0].split(/\s+/);
    return lines.slice(1).map(line => {
      const parts = line.split(/\s+/);
      const disk: Record<string, string> = {};
      headers.forEach((h, i) => (disk[h] = parts[i]));
      return disk;
    });
  }

  private async getUsage() {
    return {
      cpu: {
        cores: os.cpus().length,
        load: os.loadavg()[0],
      },
      memory: {
        total: Math.ceil(os.totalmem() / 1024 / 1024), // MB
        free: Math.ceil(os.freemem() / 1024 / 1024)    // MB
      },
      uptimeMinutes: Math.floor(os.uptime() / 60),
    };
  }

  private getDefaultInterface(): string | null {
    try {
      const output = execSync("ip route show default").toString();
      const match = output.match(/dev\s+(\S+)/);
      return match ? match[1] : null;
    } catch {
      warn(this.name, "Could not detect default interface.");
      return null;
    }
  }

  private getNetworkUsage() {
    if (!this.defaultIface) return null;

    const output = execSync("cat /proc/net/dev").toString();
    const lines = output.trim().split("\n").slice(2); // skip headers

    const ifaceLine = lines.find(l => l.trim().startsWith(this.defaultIface + ":"));
    if (!ifaceLine) return null;

    const parts = ifaceLine.split(/[:\s]+/).filter(Boolean);
    // Format: iface, rxBytes, rxPackets, rxErrs, rxDrop, rxFifo, rxFrame, rxCompressed, rxMulticast,
    //         txBytes, txPackets, txErrs, txDrop, txFifo, txColls, txCarrier, txCompressed
    const rx = parseInt(parts[1], 10);
    const tx = parseInt(parts[9], 10);

    let deltas = null;
    if (this.lastNetStats) {
      deltas = {
        rxDelta: rx - this.lastNetStats.rx,
        txDelta: tx - this.lastNetStats.tx,
      };
    }

    this.lastNetStats = { rx, tx };

    return {
      iface: this.defaultIface,
      total: { rx, tx },
      deltas,
    };
  }
}
