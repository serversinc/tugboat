"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageController = void 0;
const Http_1 = require("../services/Http");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
class ImageController {
    docker;
    constructor(dockerService) {
        if (!dockerService) {
            throw new Error("Docker service is required");
        }
        this.docker = dockerService;
    }
    /**
     * List active images
     * @param ctx
     * @returns
     */
    async list(ctx) {
        try {
            console.log("Listing images");
            const images = await this.docker.listImages();
            return ctx.json(images);
        }
        catch (err) {
            console.log(err);
            return ctx.json({ error: err.message }, 500);
        }
    }
    /**
     * Get a image by id
     * @param ctx
     * @returns
     */
    async get(ctx) {
        try {
            const id = ctx.req.param("id");
            const image = await this.docker.getImage(id);
            return ctx.json(image);
        }
        catch (err) {
            return ctx.json({ error: err.message }, 500);
        }
    }
    /**
     * Create a new image
     * @param ctx
     * @returns
     */
    async create(ctx) {
        try {
            const options = (await ctx.req.json());
            // Start build in background
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            (async () => {
                try {
                    console.log(`Starting build for ${options.name} with tag ${options.tag}`);
                    // Construct the repository URL with the token for authentication
                    const repoUrl = `https://${options.token}@github.com/${options.name}.git`;
                    const repoOrg = options.name.split("/")[0];
                    const repoName = options.name.split("/").pop();
                    const volumePath = `/workspace/${repoOrg}`;
                    const hostTugboatPath = path_1.default.join(process.env.HOST_TUGBOAT_PATH || os_1.default.homedir(), "tugboat");
                    // Create a temp container to populate the volume
                    const gitContainer = await this.docker.createContainer({
                        Image: "alpine/git",
                        Cmd: ["clone", repoUrl, `${volumePath}/${repoName}`],
                        Tty: false,
                        WorkingDir: "/workspace",
                        HostConfig: {
                            Binds: [`${hostTugboatPath}:/workspace:rw`],
                            AutoRemove: true,
                        },
                    });
                    await gitContainer.start();
                    await gitContainer.wait(); // Wait until clone is done
                    // Check if buildpacksio/pack image is available locally
                    const packImage = await this.docker.getImage("buildpacksio/pack").catch(() => null);
                    if (!packImage) {
                        await this.docker.pullImage("buildpacksio/pack");
                    }
                    // Run the `pack` builder as a Docker container
                    const container = await this.docker.createContainer({
                        Image: "buildpacksio/pack",
                        Cmd: ["build", repoName, "--builder", "heroku/builder:22", "--path", `/workspace/${repoOrg}/${repoName}`, "-t", `${repoOrg}/${repoName}:${options.tag}`, "--verbose"],
                        Tty: true,
                        WorkingDir: `/workspace/${repoOrg}/${repoName}`,
                        HostConfig: {
                            Binds: ["/var/run/docker.sock:/var/run/docker.sock:rw", `${hostTugboatPath}:/workspace:rw`],
                            AutoRemove: true,
                        },
                    });
                    await container.start();
                    // Stream logs from the container
                    const logs = [];
                    const stream = await container.logs({
                        follow: true,
                        stdout: true,
                        stderr: true,
                    });
                    stream.on("data", chunk => {
                        logs.push(chunk.toString());
                        // Optionally log to the console
                    });
                    const exitCode = await container.wait();
                    if (exitCode.StatusCode !== 0) {
                        await Http_1.httpService.post({
                            type: "build_failed",
                            image: {
                                name: `${repoOrg}/${repoName}:${options.tag}`,
                                logs,
                                error: `Pack build failed with exit code ${exitCode.StatusCode}`,
                            },
                            applicationId: options.applicationId,
                        });
                        return;
                    }
                    console.log(`Pack build completed with exit code ${exitCode.StatusCode}`);
                    await Http_1.httpService.post({
                        type: "build_completed",
                        image: {
                            name: `${repoOrg}/${repoName}:${options.tag}`,
                            logs,
                        },
                        applicationId: options.applicationId,
                    });
                }
                catch (err) {
                    console.error("Error during image build:", err);
                    await Http_1.httpService.post({
                        type: "build_failed",
                        image: {
                            name: options.name,
                            logs: [],
                            error: err.message,
                        },
                        applicationId: options.applicationId,
                    });
                }
            })();
            // Respond immediately
            return ctx.json({
                success: true,
                message: `Build started for ${options.name}`,
            });
        }
        catch (err) {
            return ctx.json({
                success: false,
                error: err.message,
            }, 500);
        }
    }
    /**
     * Pull an image
     * @param ctx
     * @returns
     */
    async pull(ctx) {
        try {
            const options = (await ctx.req.json());
            await this.docker.pullImage(options.name);
            return ctx.json({
                success: true,
                message: `image pulled: ${options.name}`,
            });
        }
        catch (err) {
            return ctx.json({
                success: false,
                error: err.message,
            }, 500);
        }
    }
    /**
     * Remove a image
     * @param ctx
     * @returns
     */
    async remove(ctx) {
        try {
            const id = ctx.req.param("id");
            await this.docker.removeImage(id);
            return ctx.json({
                success: true,
                message: "image removed",
            });
        }
        catch (err) {
            return ctx.json({
                success: false,
                error: err.message,
            }, 500);
        }
    }
    /**
     * Prune images
     * @param ctx
     */
    async prune(ctx) {
        try {
            await this.docker.pruneImages();
            return ctx.json({
                success: true,
                message: "images pruned",
            });
        }
        catch (err) {
            return ctx.json({
                success: false,
                error: err.message,
            }, 500);
        }
    }
}
exports.ImageController = ImageController;
