import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { after, mock, test } from "node:test";
import { promisify } from "node:util";

let output = "";
let failure;
const calls = [];
function execFile() {
  throw new Error("Expected promisified execFile");
}
execFile[promisify.custom] = async (file, args, options) => {
  calls.push({ file, args, options });
  if (failure) throw failure;
  return { stdout: output, stderr: "" };
};
mock.module("node:child_process", {
  exports: { execFile },
});
const { searchFiles } = await import("../src/search-files.ts");

await mkdir(".tmp", { recursive: true });
const directory = await mkdtemp(resolve(".tmp", "search-test-"));
after(() => rm(directory, { recursive: true, force: true }));

test("blank queries do not launch a search", async () => {
  const before = calls.length;
  assert.deepEqual(await searchFiles(directory, " \t"), []);
  assert.equal(calls.length, before);
});

test("paths and query text remain separate literal arguments", async () => {
  const scope = resolve(directory, "日本語 ' & $(literal)");
  await mkdir(scope);
  const query = '-live "quote" & $HOME';
  const paths = [resolve(scope, "a\nb.txt"), resolve(scope, "日本語.txt")];
  output = `${paths.join("\0")}\0`;
  const controller = new AbortController();
  assert.deepEqual(await searchFiles(scope, query, controller.signal), paths);
  const call = calls.at(-1);
  assert.equal(call.file, "/usr/bin/mdfind");
  assert.deepEqual(call.args, ["-0", "-onlyin", scope, "-name", query]);
  assert.equal(call.options.signal, controller.signal);
  assert.ok(call.options.timeout > 0);
});

test("missing, relative, and non-directory scopes fail before searching", async () => {
  const file = resolve(directory, "file.txt");
  await writeFile(file, "");
  const before = calls.length;
  for (const scope of [".", file, resolve(directory, "missing")]) {
    await assert.rejects(searchFiles(scope, "file"));
  }
  assert.equal(calls.length, before);
});

test("empty Spotlight results are an empty list", async () => {
  output = "";
  assert.deepEqual(await searchFiles(directory, "missing"), []);
});

test("search errors propagate to the view", async () => {
  failure = new Error("Spotlight unavailable");
  await assert.rejects(searchFiles(directory, "file"), failure);
  failure = undefined;
});
