import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function searchFiles(
  directory: string,
  query: string,
  signal?: AbortSignal,
): Promise<string[]> {
  if (!query.trim()) return [];
  if (!isAbsolute(directory) || !(await stat(directory)).isDirectory()) {
    throw new Error("Search path must be an existing absolute directory");
  }

  const { stdout } = await execFileAsync(
    "/usr/bin/mdfind",
    ["-0", "-onlyin", directory, "-name", query],
    { signal, timeout: 15_000, maxBuffer: 8 * 1024 * 1024 },
  );
  return stdout.split("\0").filter(Boolean);
}
