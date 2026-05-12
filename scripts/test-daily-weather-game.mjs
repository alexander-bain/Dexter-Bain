import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  return "text/plain; charset=utf-8";
}

function createStaticServer() {
  return http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "No test API server" }));
      return;
    }

    const filePath = path.resolve(repoRoot, `.${decodeURIComponent(url.pathname)}`);
    if (!filePath.startsWith(repoRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": contentType(filePath) });
    fs.createReadStream(filePath).pipe(response);
  });
}

function waitForServer(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function waitForDebugUrl(chrome) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome did not start remote debugging in time.")), 15000);
    chrome.stderr.setEncoding("utf8");
    chrome.stderr.on("data", (chunk) => {
      const match = chunk.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    chrome.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited before test started: ${code}`));
    });
  });
}

function cdpConnection(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });

  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  return {
    async send(method, params = {}, sessionId = undefined) {
      await opened;
      const messageId = ++id;
      ws.send(JSON.stringify({ id: messageId, method, params, sessionId }));
      return new Promise((resolve, reject) => pending.set(messageId, { resolve, reject }));
    },
    close() {
      ws.close();
    }
  };
}

async function run() {
  const server = createStaticServer();
  const port = await waitForServer(server);
  const targetUrl = `http://127.0.0.1:${port}/minigames/index.html`;
  const userDataDir = fs.mkdtempSync(path.join("/tmp", "daily-weather-chrome-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    targetUrl
  ], { stdio: ["ignore", "ignore", "pipe"] });

  let connection;
  try {
    const wsUrl = await waitForDebugUrl(chrome);
    connection = cdpConnection(wsUrl);
    const targets = await connection.send("Target.getTargets");
    const page = targets.targetInfos.find((target) => target.type === "page");
    if (!page) throw new Error("No Chrome page target found.");

    const { sessionId } = await connection.send("Target.attachToTarget", {
      targetId: page.targetId,
      flatten: true
    });

    await connection.send("Runtime.enable", {}, sessionId);
    const result = await connection.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          for (let attempt = 0; attempt < 80; attempt += 1) {
            if (document.querySelector("#eventTitle")?.textContent?.includes("Weather")) break;
            await wait(100);
          }

          const game = currentGame();
          if (!game?.id?.startsWith("daily-weather-")) {
            throw new Error("Daily weather game was not first in the game list.");
          }

          playerNameEl.value = "Weather Bot";
          playerNameEl.dispatchEvent(new Event("input", { bubbles: true }));
          game.questions.forEach((question, index) => {
            const best = getAnswers(question).slice().sort((a, b) => b.odds - a.odds)[0];
            const questionId = getQuestionId(question, index);
            const input = formEl.querySelector(\`input[name="\${CSS.escape(questionId)}"][value="\${CSS.escape(best.id)}"]\`);
            if (!input) throw new Error(\`Could not find input for \${questionId}\`);
            input.checked = true;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
          formEl.querySelector('input[name="notify"][value="none"]').checked = true;
          formEl.requestSubmit();
          await wait(1200);

          return {
            title: eventTitle.textContent,
            entryCount: entryCount.textContent,
            saveNote: saveNote.textContent,
            leaderboard: leaderboard.textContent,
            chosen: game.questions.map((question, index) => {
              const questionId = getQuestionId(question, index);
              const checked = formEl.querySelector(\`input[name="\${CSS.escape(questionId)}"]:checked\`);
              return checked ? checked.value : "";
            })
          };
        })()
      `
    }, sessionId);

    const value = result.result.value;
    if (!value?.leaderboard?.includes("Weather Bot") || !value?.saveNote?.includes("Weather Bot")) {
      throw new Error(`Weather Bot test did not save correctly: ${JSON.stringify(value)}`);
    }

    console.log(`Daily weather game test passed: ${value.title}; ${value.saveNote}`);
  } finally {
    connection?.close();
    chrome.kill("SIGTERM");
    server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
