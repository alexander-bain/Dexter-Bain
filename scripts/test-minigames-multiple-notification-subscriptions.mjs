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

const sharedSubscription = {
  endpoint: "https://push.example.test/shared-device",
  expirationTime: null,
  keys: { p256dh: "invalid-test-key", auth: "invalid-test-auth" },
};
let remoteData = {
  subscriptions: [
    {
      subscription: sharedSubscription,
      gameId: "game-one",
      roomCode: null,
      playerName: "Dex",
      notify: "updates",
      updatedAt: "2026-08-31T12:00:00.000Z",
    },
  ],
};

const remoteServer = http.createServer((request, response) => {
  if (request.method === "GET") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(remoteData));
    return;
  }

  if (request.method === "PUT") {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      remoteData = JSON.parse(body);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  response.writeHead(405);
  response.end();
});

const remotePort = await listen(remoteServer);
const backendPort = await unusedPort();
const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "notification-test-"));
const child = spawn(process.execPath, ["server.js"], {
  cwd: path.resolve(import.meta.dirname, ".."),
  env: {
    ...process.env,
    PORT: String(backendPort),
    OPENAI_API_KEY: "test-key",
    DATABASE_URL: "",
    POSTGRES_URL: "",
    NOTIFICATIONS_DATA_URL: `http://127.0.0.1:${remotePort}/notifications`,
    JSONBLOB_NOTIFICATIONS_URL: "",
    NOTIFICATIONS_DATA_FILE: path.join(tempDirectory, "notifications-data.json"),
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
  const response = await fetch(`http://127.0.0.1:${backendPort}/api/notifications/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: sharedSubscription,
      gameId: "game-two",
      playerName: "Dex",
      notify: "updates",
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(
    remoteData.subscriptions.map((item) => item.gameId).sort(),
    ["game-one", "game-two"]
  );
  console.log("Minigames multiple-notification subscription test passed.");
} catch (error) {
  if (backendOutput) process.stderr.write(backendOutput);
  throw error;
} finally {
  child.kill("SIGTERM");
  await close(remoteServer);
  await fs.rm(tempDirectory, { recursive: true, force: true });
}
