"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerService = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const dotenv_1 = __importDefault(require("dotenv"));
const transformers_1 = require("../utils/transformers");
const console_1 = require("../utils/console");
dotenv_1.default.config();
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class DockerService {
    name = "Docker";
    docker;
    constructor() {
        this.docker = new dockerode_1.default({ socketPath: "/var/run/docker.sock" });
        (0, console_1.info)(this.name, "Initialized Docker client");
    }
    async listContainers() {
        const containers = await this.docker.listContainers({
            all: true,
        });
        return containers.map(container => (0, transformers_1.normalizeContainer)(container));
    }
    async getContainer(id) {
        const container = this.docker.getContainer(id);
        return await container.inspect();
    }
    async createContainer(options) {
        return await this.docker.createContainer(options);
    }
    async removeContainer(id) {
        const container = this.docker.getContainer(id);
        await container.remove();
    }
    async restartContainer(id) {
        const container = this.docker.getContainer(id);
        await container.restart();
    }
    async startContainer(id) {
        const container = this.docker.getContainer(id);
        await container.start();
    }
    async stopContainer(id) {
        const container = this.docker.getContainer(id);
        await container.stop();
    }
    /** IMAGES */
    async listImages() {
        return await this.docker.listImages();
    }
    async getImage(id) {
        return await this.docker.getImage(id).inspect();
    }
    async pullImage(name, auth) {
        return new Promise((resolve, reject) => {
            (0, console_1.info)(this.name, `Attempting to pull image: ${name}`);
            let authconfig = undefined;
            if (auth && auth.username && auth.password && auth.registry) {
                authconfig = {
                    username: auth.username,
                    password: auth.password,
                    serveraddress: auth.registry,
                    auth: '',
                };
                this.docker.checkAuth(authconfig, (err) => {
                    if (err) {
                        (0, console_1.error)(this.name, `Authentication failed for image ${name}: ${err.message}`);
                        return reject(err);
                    }
                    (0, console_1.info)(this.name, `Authentication successful for image ${name}`);
                });
            }
            this.docker.pull(name, { 'authconfig': authconfig }, (err, stream) => {
                if (err) {
                    (0, console_1.error)(this.name, `Error pulling image ${name}: ${err.message}`);
                    return reject(err);
                }
                this.docker.modem.followProgress(stream, (err, output) => {
                    if (err) {
                        (0, console_1.error)(this.name, `Error during followProgress for image ${name}: ${err.message}`);
                        return reject(err);
                    }
                    (0, console_1.info)(this.name, `Successfully pulled image: ${name}`);
                    resolve();
                }, (event) => {
                    if (event && event.status) {
                        (0, console_1.info)(this.name, `Pulling image ${name}: ${event.status} ${event.progress || ''}`);
                    }
                });
            });
        });
    }
    async removeImage(id) {
        return await this.docker.getImage(id).remove();
    }
    async pruneImages() {
        return await this.docker.pruneImages();
    }
    async checkImageExists(id) {
        try {
            await this.docker.getImage(id).inspect();
            return true;
        }
        catch (err) {
            if (err.statusCode === 404) {
                return false;
            }
            throw err;
        }
    }
    /** COMPOSE */
    async startCompose(directory) {
        const command = `docker-compose -f ${directory}/docker-compose.yml up -d`;
        (0, console_1.info)(this.name, `Starting compose in ${directory}`);
        await execAsync(command);
        (0, console_1.info)(this.name, `Compose started successfully in ${directory}`);
    }
    async stopCompose(directory) {
        const command = `docker-compose -f ${directory}/docker-compose.yml down`;
        (0, console_1.info)(this.name, `Stopping compose in ${directory}`);
        await execAsync(command);
        (0, console_1.info)(this.name, `Compose stopped successfully in ${directory}`);
    }
}
exports.DockerService = DockerService;
