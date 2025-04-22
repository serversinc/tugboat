import os from "os";
import path from "path";
import fs from "fs";

/**
 * Get the base directory based on platform
 * @returns {string} Base directory path
 */
export function getBaseDirectory(): string {
  let baseDir: string;

  const isWindows = os.platform() === "win32";
  isWindows ? (baseDir = path.resolve(__dirname, "../../repos")) : (baseDir = "/tugboat");

  // Ensure the base directory exists
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  return baseDir;
}

export function getTargetDirectory(repoName: string): string {
  const baseDir = getBaseDirectory();
  return path.join(baseDir, repoName);
}
