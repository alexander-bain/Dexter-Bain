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

let remoteData = {
  games: {
    "preservation-test": {
      entries: [],
      rooms: {},
      results: {
        winner: {
          questionId: "winner",
          answerId: "player-a",
          status: "resolved",
          source: "https://example.com/final",
          note: "Player A won.",
          checkedAt: "2026-08-31T12:00:00.000Z",
        },
      },
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
const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "minigames-result-test-"));
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
    MINIGAMES_DATA_FILE: path.join(tempDirectory, "minigames-data.json"),
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

  const response = await fetch(
    `http://127.0.0.1:${backendPort}/api/minigames/preservation-test/results/check`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: [
          {
            id: "winner",
            text: "Who won?",
            answers: [
              { id: "player-a", label: "Player A" },
              { id: "player-b", label: "Player B" },
            ],
          },
        ],
      }),
    }
  );
  const body = await response.json();
  const result = body.results.find((item) => item.questionId === "winner");

  assert.equal(response.status, 200);
  assert.equal(result.status, "resolved");
  assert.equal(result.answerId, "player-a");
  assert.equal(remoteData.games["preservation-test"].results.winner.status, "resolved");
  assert.equal(remoteData.games["preservation-test"].results.winner.answerId, "player-a");
  console.log("Minigames resolved-result preservation test passed.");
} catch (error) {
  if (backendOutput) process.stderr.write(backendOutput);
  throw error;
} finally {
  child.kill("SIGTERM");
  await close(remoteServer);
  await fs.rm(tempDirectory, { recursive: true, force: true });
}
