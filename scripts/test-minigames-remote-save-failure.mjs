import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
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

const remoteData = {
  games: {
    existing: {
      entries: [{ name: "Existing", picks: ["yes"], savedAt: "2026-01-01T00:00:00.000Z" }],
      rooms: {},
      results: {},
    },
  },
  customGames: [],
};

const remoteServer = http.createServer((request, response) => {
  if (request.method === "GET") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(remoteData));
    return;
  }

  response.writeHead(503, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "remote store unavailable" }));
});

const remotePort = await listen(remoteServer);
const backendPort = await unusedPort();
const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "minigames-save-test-"));
const backupFile = path.join(tempDirectory, "minigames-data.json");
const child = spawn(process.execPath, ["server.js"], {
  cwd: path.resolve(import.meta.dirname, ".."),
  env: {
    ...process.env,
    PORT: String(backendPort),
    OPENAI_API_KEY: "test-key",
    DATABASE_URL: "",
    POSTGRES_URL: "",
    MINIGAMES_DATA_URL: `http://127.0.0.1:${remotePort}/minigames`,
    JSONBLOB_MINIGAMES_URL: "",
    MINIGAMES_DATA_FILE: backupFile,
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

try {
  await waitForServer(`http://127.0.0.1:${backendPort}/`, child);

  const response = await fetch(`http://127.0.0.1:${backendPort}/api/minigames/test-game/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Dex", picks: ["winner"] }),
  });

  assert.equal(
    response.status,
    500,
    "A failed primary save must not be reported to the player as successful"
  );

  const backup = JSON.parse(await fs.readFile(backupFile, "utf8"));
  assert.equal(backup.games["test-game"].entries[0].name, "Dex");
  assert.deepEqual(backup.games["test-game"].entries[0].picks, ["winner"]);
  console.log("Minigames remote-save failure test passed.");
} catch (error) {
  if (backendOutput) process.stderr.write(backendOutput);
  throw error;
} finally {
  child.kill("SIGTERM");
  await close(remoteServer);
  await fs.rm(tempDirectory, { recursive: true, force: true });
}
