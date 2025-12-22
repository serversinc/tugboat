"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubController = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = require("../utils/path");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class GithubController {
    /**
     * Pull a repository from Github
     * @param ctx
     */
    async pull(ctx) {
        try {
            const { repo, branch, token } = (await ctx.req.json());
            if (!repo || !branch || !token) {
                return ctx.json({ error: "Missing required parameters" }, 400);
            }
            // Construct the repository URL with the token for authentication
            const repoUrl = `https://${token}@github.com/${repo}.git`;
            // Define the directory where the repository will be cloned
            const targetDir = (0, path_1.getTargetDirectory)(repo);
            // If the directory already exists, delete it
            if (fs_1.default.existsSync(targetDir)) {
                fs_1.default.rmdirSync(targetDir, { recursive: true });
            }
            // Clone the repository and checkout the specified branch
            const cloneCommand = `git clone --branch ${branch} ${repoUrl} ${targetDir}`;
            // Execute the command
            await execAsync(cloneCommand);
            return ctx.json({
                success: true,
                message: `Repository ${repo} cloned successfully to ${targetDir}`,
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
exports.GithubController = GithubController;
