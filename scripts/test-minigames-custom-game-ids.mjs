import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function unusedPort() {
  const server = net.createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Backend exited before becoming ready (${child.exitCode})`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The backend is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Backend did not become ready");
}

const backendPort = await unusedPort();
const child = spawn(process.execPath, ["server.js"], {
  cwd: path.resolve(import.meta.dirname, ".."),
  env: {
    ...process.env,
    PORT: String(backendPort),
    OPENAI_API_KEY: "test-key",
    DATABASE_URL: "",
    POSTGRES_URL: "",
    MINIGAMES_DATA_URL: "http://127.0.0.1:9/unreachable",
    JSONBLOB_MINIGAMES_URL: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let backendOutput = "";
child.stdout.on("data", (chunk) => {
  backendOutput += chunk;
});
child.stderr.on("data", (chunk) => {
  backendOutput += chunk;
});

const questions = Array.from({ length: 5 }, (_, index) => ({
  id: index < 2 ? "duplicate-question" : `question-${index + 1}`,
  text: `Question ${index + 1}`,
  answers: [
    { id: "yes", label: "Yes", odds: 50, points: 10 },
    { id: "no", label: "No", odds: 50, points: 10 },
  ],
}));

try {
  await waitForServer(`http://127.0.0.1:${backendPort}/`, child);

  const response = await fetch(`http://127.0.0.1:${backendPort}/api/minigames/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Duplicate IDs", creator: "Dex", questions }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "Custom game questions need unique ids");
  console.log("Minigames custom-game ID test passed.");
} catch (error) {
  if (backendOutput) process.stderr.write(backendOutput);
  throw error;
} finally {
  child.kill("SIGTERM");
}
