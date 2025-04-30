import { Context } from "hono";

import { exec } from "child_process";
import { promisify } from "util";

import fs from "fs";
import { getTargetDirectory } from "../utils/path";

const execAsync = promisify(exec);

export class GithubController {
  /**
   * Pull a repository from Github
   * @param ctx
   */
  public async pull(ctx: Context) {
    try {
      const { repo, branch, token } = (await ctx.req.json()) as { repo: string; branch: string; token: string };

      if (!repo || !branch || !token) {
        return ctx.json({ error: "Missing required parameters" }, 400);
      }

      // Construct the repository URL with the token for authentication
      const repoUrl = `https://${token}@github.com/${repo}.git`;

      // Define the directory where the repository will be cloned
      const targetDir = getTargetDirectory(repo);

      // If the directory already exists, delete it
      if (fs.existsSync(targetDir)) {
        fs.rmdirSync(targetDir, { recursive: true });
      }

      // Clone the repository and checkout the specified branch
      const cloneCommand = `git clone --branch ${branch} ${repoUrl} ${targetDir}`;

      // Execute the command
      await execAsync(cloneCommand);

      return ctx.json({
        success: true,
        message: `Repository ${repo} cloned successfully to ${targetDir}`,
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
