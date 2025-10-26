import { Context } from "hono";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { getTargetDirectory } from "../utils/path";
import { DockerService } from "../services/Docker";

const execAsync = promisify(exec);

export class ComposeController {
  constructor(private dockerService: DockerService) {}

  /**
   * Start a docker compose from a GitHub repository
   * @param ctx
   */
  public async start(ctx: Context) {
    try {
      const { repo, branch, token } = (await ctx.req.json()) as { repo: string; branch: string; token: string };

      if (!repo || !branch || !token) {
        return ctx.json({ error: "Missing required parameters: repo, branch, token" }, 400);
      }

      const targetDir = getTargetDirectory(repo);

      // Check if directory exists, if not, pull the repo
      if (!fs.existsSync(targetDir)) {
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
    } catch (err) {
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
   * Stop a docker compose from a GitHub repository
   * @param ctx
   */
  public async stop(ctx: Context) {
    try {
      const { repo } = (await ctx.req.json()) as { repo: string };

      if (!repo) {
        return ctx.json({ error: "Missing required parameter: repo" }, 400);
      }

      const targetDir = getTargetDirectory(repo);

      // Check if directory exists
      if (!fs.existsSync(targetDir)) {
        return ctx.json({ error: `Repository ${repo} not found` }, 404);
      }

      // Stop the compose
      await this.dockerService.stopCompose(targetDir);

      return ctx.json({
        success: true,
        message: `Compose for ${repo} stopped successfully`,
      });
    } catch (err) {
      return ctx.json(
        {
          success: false,
          error: (err as Error).message,
        },
        500
      );
    }
  }
}