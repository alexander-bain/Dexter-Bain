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

function createStaticServer({ apiBase = "" } = {}) {
  return http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "No shared API on static preview" }));
      return;
    }

    const filePath = path.resolve(repoRoot, `.${decodeURIComponent(url.pathname)}`);
    if (!filePath.startsWith(repoRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": contentType(filePath) });
    if (filePath.endsWith(path.join("minigames", "index.html")) && apiBase) {
      const html = fs.readFileSync(filePath, "utf8").replace(
        "<script>",
        `<script>window.MINIGAMES_API_BASE = ${JSON.stringify(apiBase)};</script>\n  <script>`
      );
      response.end(html);
      return;
    }

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
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
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

async function withChrome(url, expression) {
  const userDataDir = fs.mkdtempSync(path.join("/tmp", "weekend-weather-chrome-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    url
  ], { stdio: ["ignore", "ignore", "pipe"] });

  let connection;
  try {
    const wsUrl = await waitForDebugUrl(chrome);
    connection = cdpConnection(wsUrl);
    const targets = await connection.send("Target.getTargets");
    const page = targets.targetInfos.find((target) => target.type === "page");
    const { sessionId } = await connection.send("Target.attachToTarget", {
      targetId: page.targetId,
      flatten: true
    });
    await connection.send("Runtime.enable", {}, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 750));
    const result = await connection.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression
    }, sessionId);
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Browser test threw an exception");
    }
    return result.result.value;
  } finally {
    connection?.close();
    chrome.kill("SIGTERM");
  }
}

async function run() {
  const apiBase = process.env.MINIGAMES_API_BASE || "";
  const server = createStaticServer({ apiBase });
  const port = await waitForServer(server);
  const url = `http://127.0.0.1:${port}/minigames/index.html`;
  const pickTargetGame = `
    (() => {
      const buttons = [...document.querySelectorAll("[data-game]")];
      return buttons.find((button) => button.dataset.game.includes("weather-weekend"))
        || buttons.find((button) => button.dataset.game.includes("daily-weather-"))
        || buttons[0]
        || null;
    })()
  `;

  try {
    const submitResult = await withChrome(url, `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (typeof currentGame === "function" && eventTabs.children.length) break;
          await wait(100);
        }
        const gameButton = ${pickTargetGame};
        if (!gameButton) {
          throw new Error("No playable minigame tab was visible.");
        }
        gameButton.click();
        await wait(100);
        const game = currentGame();
        playerNameEl.value = "Weekend Tester";
        playerNameEl.dispatchEvent(new Event("input", { bubbles: true }));
        game.questions.forEach((question, index) => {
          const best = getAnswers(question).slice().sort((a, b) => b.odds - a.odds)[0];
          const questionId = getQuestionId(question, index);
          const input = formEl.querySelector(\`input[name="\${CSS.escape(questionId)}"][value="\${CSS.escape(best.id)}"]\`);
          input.checked = true;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        formEl.querySelector('input[name="notify"][value="none"]').checked = true;
        formEl.requestSubmit();
        await wait(1200);
        return {
          title: eventTitle.textContent,
          saveNote: saveNote.textContent,
          leaderboard: leaderboard.textContent
        };
      })()
    `);

    const secondBrowserResult = await withChrome(url, `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (typeof currentGame === "function" && eventTabs.children.length) break;
          await wait(100);
        }
        const gameButton = ${pickTargetGame};
        if (!gameButton) {
          throw new Error("No playable minigame tab was visible.");
        }
        gameButton.click();
        await wait(1000);
        return {
          title: eventTitle.textContent,
          entryCount: entryCount.textContent,
          leaderboard: leaderboard.textContent,
          status: document.body.textContent.includes("Saved on this device") ? "device-only" : "shared"
        };
      })()
    `);

    console.log(JSON.stringify({ submitResult, secondBrowserResult }, null, 2));

    if (!secondBrowserResult.leaderboard.includes("Weekend Tester")) {
      throw new Error("Weekend Weather Watch entry did not appear in a second browser profile.");
    }
  } finally {
    server.close();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
