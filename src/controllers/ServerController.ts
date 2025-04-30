import { Context } from "hono";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class ServerController {
  /**
   * Run a command on the server
   * @param ctx
   */
  public async runCommand(ctx: Context) {
    try {
      const { command } = await ctx.req.json<{ command: string }>();

      if (!command) {
        return ctx.json({ error: "Command is required" }, 400);
      }

      const { stdout, stderr } = await execAsync(command);

      const formatOutput = (output: string) =>
        output
          .trim()
          .split("\n") // Split by newlines
          .map(line => line.trim()) // Trim each line
          .filter(line => line.length > 0); // Remove empty lines

      return ctx.json({
        success: true,
        stdout: formatOutput(stdout),
        stderr: formatOutput(stderr),
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
