"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComposeController = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = require("../utils/path");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ComposeController {
    dockerService;
    constructor(dockerService) {
        this.dockerService = dockerService;
    }
    /**
     * Start a docker compose from a GitHub repository
     * @param ctx
     */
    async start(ctx) {
        try {
            const { repo, branch, token } = (await ctx.req.json());
            if (!repo || !branch || !token) {
                return ctx.json({ error: "Missing required parameters: repo, branch, token" }, 400);
            }
            const targetDir = (0, path_1.getTargetDirectory)(repo);
            // Check if directory exists, if not, pull the repo
            if (!fs_1.default.existsSync(targetDir)) {
                // Reuse GitHub pull logic
                const repoUrl = `https://${token}@github.com/${repo}.git`;
                const cloneCommand = `git clone --branch ${branch} ${repoUrl} ${targetDir}`;
                await execAsync(cloneCommand);
            }
            // Start the compose
            await this.dockerService.startCompose(targetDir);
            return ctx.json({
                success: true,
                message: `Compose for ${repo} started successfully`,
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
     * Stop a docker compose from a GitHub repository
     * @param ctx
     */
    async stop(ctx) {
        try {
            const { repo } = (await ctx.req.json());
            if (!repo) {
                return ctx.json({ error: "Missing required parameter: repo" }, 400);
            }
            const targetDir = (0, path_1.getTargetDirectory)(repo);
            // Check if directory exists
            if (!fs_1.default.existsSync(targetDir)) {
                return ctx.json({ error: `Repository ${repo} not found` }, 404);
            }
            // Stop the compose
            await this.dockerService.stopCompose(targetDir);
            return ctx.json({
                success: true,
                message: `Compose for ${repo} stopped successfully`,
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
exports.ComposeController = ComposeController;
