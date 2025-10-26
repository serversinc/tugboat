"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeartbeatService = void 0;
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const Http_1 = require("./Http");
const console_1 = require("../utils/console");
class HeartbeatService {
    name = "Heartbeat";
    aliveInterval = null;
    metricsInterval = null;
    docker = null;
    defaultIface = null;
    lastNetStats = null;
    constructor(dockerService) {
        if (!process.env.TUGBOAT_PHONE_HOME_URL) {
            (0, console_1.warn)(this.name, "TUGBOAT_PHONE_HOME_URL is not set. Heartbeat service will not start.");
            return;
        }
        this.docker = dockerService;
        this.defaultIface = this.getDefaultInterface();
        (0, console_1.info)(this.name, `Initialized. Tracking interface: ${this.defaultIface ?? "none"}`);
    }
    start() {
        if (!this.docker)
            return;
        if (this.aliveInterval || this.metricsInterval) {
            (0, console_1.warn)(this.name, "Service is already running.");
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
        (0, console_1.info)(this.name, "Service started.");
    }
    stop() {
        if (this.aliveInterval)
            clearInterval(this.aliveInterval);
        if (this.metricsInterval)
            clearInterval(this.metricsInterval);
        this.aliveInterval = null;
        this.metricsInterval = null;
        (0, console_1.info)(this.name, "Service stopped.");
    }
    async sendAliveHeartbeat() {
        try {
            await Http_1.httpService.post({ type: "alive" });
            (0, console_1.info)(this.name, "Sent alive heartbeat.");
        }
        catch (err) {
            (0, console_1.error)(this.name, `Alive heartbeat failed: ${err.message}`);
        }
    }
    async sendMetricsHeartbeat() {
        try {
            const containers = await this.getContainers();
            const usage = await this.getUsage();
            const disk = this.getDiskUsage();
            const network = this.getNetworkUsage();
            await Http_1.httpService.post({
                type: "metrics",
                containers,
                usage,
                disk,
                network,
            });
            (0, console_1.info)(this.name, "Sent metrics heartbeat.");
        }
        catch (err) {
            (0, console_1.error)(this.name, `Metrics heartbeat failed: ${err.message}`);
        }
    }
    async getContainers() {
        return this.docker.listContainers();
    }
    getDiskUsage() {
        const output = (0, child_process_1.execSync)("df -h --output=source,fstype,size,used,avail,pcent,target -x tmpfs -x devtmpfs").toString();
        const lines = output.trim().split("\n");
        const headers = lines[0].split(/\s+/);
        return lines.slice(1).map(line => {
            const parts = line.split(/\s+/);
            const disk = {};
            headers.forEach((h, i) => (disk[h] = parts[i]));
            return disk;
        });
    }
    async getUsage() {
        return {
            cpu: {
                cores: os_1.default.cpus().length,
                load: os_1.default.loadavg()[0],
            },
            memory: {
                total: Math.ceil(os_1.default.totalmem() / 1024 / 1024), // MB
                free: Math.ceil(os_1.default.freemem() / 1024 / 1024) // MB
            },
            uptimeMinutes: Math.floor(os_1.default.uptime() / 60),
        };
    }
    getDefaultInterface() {
        try {
            const output = (0, child_process_1.execSync)("ip route show default").toString();
            const match = output.match(/dev\s+(\S+)/);
            return match ? match[1] : null;
        }
        catch {
            (0, console_1.warn)(this.name, "Could not detect default interface.");
            return null;
        }
    }
    getNetworkUsage() {
        if (!this.defaultIface)
            return null;
        const output = (0, child_process_1.execSync)("cat /proc/net/dev").toString();
        const lines = output.trim().split("\n").slice(2); // skip headers
        const ifaceLine = lines.find(l => l.trim().startsWith(this.defaultIface + ":"));
        if (!ifaceLine)
            return null;
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
exports.HeartbeatService = HeartbeatService;
