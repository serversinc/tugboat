import path from "path";

/**
 * Get the base directory based on platform
 * @returns {string} Base directory path
 */
export function getBaseDirectory(): string {
  return path.resolve(process.cwd(), "../tugboat");
}

export function getTargetDirectory(repoName: string): string {
  const baseDir = getBaseDirectory();
  return path.join(baseDir, repoName);
}