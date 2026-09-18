import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function searchFiles(
  directory: string,
  query: string,
  {
    signal,
    showHidden = false,
  }: { signal?: AbortSignal; showHidden?: boolean } = {},
): Promise<string[]> {
  if (!isAbsolute(directory) || !(await stat(directory)).isDirectory()) {
    throw new Error("Search path must be an existing absolute directory");
  }
  const names = await readdir(directory);
  const term = query.trim().normalize("NFC").toLocaleLowerCase();
  let paths = names
    .filter((name) => name.normalize("NFC").toLocaleLowerCase().includes(term))
    .sort()
    .map((name) => join(directory, name));
  if (term) {
    const { stdout } = await execFileAsync(
      "/usr/bin/mdfind",
      ["-0", "-onlyin", directory, "-name", query],
      { signal, timeout: 15_000, maxBuffer: 8 * 1024 * 1024 },
    );
    paths = [...new Set([...paths, ...stdout.split("\0").filter(Boolean)])];
  }
  return paths.filter(
    (path) =>
      showHidden ||
      !relative(directory, path)
        .split(sep)
        .some((name) => name.startsWith(".")),
  );
}
