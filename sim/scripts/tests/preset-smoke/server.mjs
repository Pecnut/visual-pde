/**
 * Shared "make sure a VisualPDE dev server is reachable" helper, used by check-presets.mjs and
 * every GUI interaction test file so each doesn't have to spawn/manage its own jekyll process.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../..");
export const BASE_URL = process.env.BASE_URL ?? "http://localhost:4000";
const SERVER_READY_TIMEOUT_MS = 60000;

export async function isServerUp() {
  try {
    const res = await fetch(BASE_URL + "/sim/");
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isServerUp()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/**
 * Starts `bundle exec jekyll serve` in the background if BASE_URL isn't already reachable.
 * Returns a cleanup function - a no-op if we didn't start anything (an already-running server,
 * possibly started by hand outside this script, is left alone).
 */
export async function ensureServerRunning() {
  if (await isServerUp()) {
    console.log(`Found an existing server at ${BASE_URL} - reusing it.`);
    return () => {};
  }

  console.log(`No server found at ${BASE_URL} - starting "bundle exec jekyll serve"...`);
  const child = spawn("bundle", ["exec", "jekyll", "serve", "--no-watch"], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));

  const up = await waitForServer(SERVER_READY_TIMEOUT_MS);
  if (!up) {
    child.kill();
    throw new Error(
      `jekyll serve did not become ready at ${BASE_URL} within ${SERVER_READY_TIMEOUT_MS}ms. Output:\n${output}`,
    );
  }
  console.log("jekyll serve is up.");
  return () => child.kill();
}
