import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function pacificDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  return "text/plain; charset=utf-8";
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function createApiServer() {
  const entriesByGameId = new Map();
  const emptyResults = { results: [] };

  function apiHeaders() {
    return {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Accept, Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const entriesMatch = url.pathname.match(/^\/api\/minigames\/([^/]+)\/entries$/);
    const resultsMatch = url.pathname.match(/^\/api\/minigames\/([^/]+)\/results$/);
    const resultsCheckMatch = url.pathname.match(/^\/api\/minigames\/([^/]+)\/results\/check$/);

    if (request.method === "OPTIONS" && (entriesMatch || resultsMatch || resultsCheckMatch)) {
      response.writeHead(204, apiHeaders());
      response.end();
      return;
    }

    if (request.method === "GET" && entriesMatch) {
      const gameId = decodeURIComponent(entriesMatch[1]);
      response.writeHead(200, apiHeaders());
      response.end(JSON.stringify({ gameId, entries: entriesByGameId.get(gameId) || [] }));
      return;
    }

    if (request.method === "POST" && entriesMatch) {
      const gameId = decodeURIComponent(entriesMatch[1]);
      const body = await readJsonBody(request);
      const name = String(body.name || "").trim().slice(0, 24);
      const notify = ["none", "win", "updates"].includes(body.notify) ? body.notify : "none";
      const picks = body.picks && typeof body.picks === "object" && !Array.isArray(body.picks)
        ? Object.fromEntries(
            Object.entries(body.picks)
              .filter(([, value]) => String(value || "").trim())
              .map(([questionId, answerId]) => [String(questionId), String(answerId)])
          )
        : {};
      const entry = {
        name,
        picks,
        notify,
        savedAt: new Date().toISOString(),
      };
      const currentEntries = (entriesByGameId.get(gameId) || []).filter(
        (savedEntry) => String(savedEntry.name || "").toLowerCase() !== name.toLowerCase()
      );
      currentEntries.push(entry);
      entriesByGameId.set(gameId, currentEntries);
      response.writeHead(200, apiHeaders());
      response.end(JSON.stringify({ gameId, entries: currentEntries }));
      return;
    }

    if (request.method === "GET" && resultsMatch) {
      const gameId = decodeURIComponent(resultsMatch[1]);
      response.writeHead(200, apiHeaders());
      response.end(JSON.stringify({ gameId, ...emptyResults }));
      return;
    }

    if (request.method === "POST" && resultsCheckMatch) {
      const gameId = decodeURIComponent(resultsCheckMatch[1]);
      response.writeHead(200, apiHeaders());
      response.end(JSON.stringify({ gameId, ...emptyResults }));
      return;
    }

    response.writeHead(404, apiHeaders());
    response.end(JSON.stringify({ error: "No test API server" }));
  });

  return { server, entriesByGameId };
}

function createStaticServer() {
  const entriesByGameId = new Map();
  const emptyResults = { results: [] };

  function apiHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");

    const entriesMatch = url.pathname.match(/^\/api\/minigames\/([^/]+)\/entries$/);
    const resultsMatch = url.pathname.match(/^\/api\/minigames\/([^/]+)\/results$/);
    const resultsCheckMatch = url.pathname.match(/^\/api\/minigames\/([^/]+)\/results\/check$/);

    if (request.method === "GET" && entriesMatch) {
      const gameId = decodeURIComponent(entriesMatch[1]);
      response.writeHead(200, apiHeaders());
      response.end(JSON.stringify({ gameId, entries: entriesByGameId.get(gameId) || [] }));
      return;
    }

    if (request.method === "POST" && entriesMatch) {
      const gameId = decodeURIComponent(entriesMatch[1]);
      readJsonBody(request).then((body) => {
        const name = String(body.name || "").trim().slice(0, 24);
        const notify = ["none", "win", "updates"].includes(body.notify) ? body.notify : "none";
        const picks = body.picks && typeof body.picks === "object" && !Array.isArray(body.picks)
          ? Object.fromEntries(
              Object.entries(body.picks)
                .filter(([, value]) => String(value || "").trim())
                .map(([questionId, answerId]) => [String(questionId), String(answerId)])
            )
          : {};
        const entry = {
          name,
          picks,
          notify,
          savedAt: new Date().toISOString(),
        };
        const currentEntries = (entriesByGameId.get(gameId) || []).filter(
          (savedEntry) => String(savedEntry.name || "").toLowerCase() !== name.toLowerCase()
        );
        currentEntries.push(entry);
        entriesByGameId.set(gameId, currentEntries);
        response.writeHead(200, apiHeaders());
        response.end(JSON.stringify({ gameId, entries: currentEntries }));
      }).catch((error) => {
        response.writeHead(500, apiHeaders());
        response.end(JSON.stringify({ error: error.message || "Bad test API request" }));
      });
      return;
    }

    if (request.method === "GET" && resultsMatch) {
      const gameId = decodeURIComponent(resultsMatch[1]);
      response.writeHead(200, apiHeaders());
      response.end(JSON.stringify({ gameId, ...emptyResults }));
      return;
    }

    if (request.method === "POST" && resultsCheckMatch) {
      const gameId = decodeURIComponent(resultsCheckMatch[1]);
      response.writeHead(200, apiHeaders());
      response.end(JSON.stringify({ gameId, ...emptyResults }));
      return;
    }

    const filePath = path.resolve(repoRoot, `.${decodeURIComponent(url.pathname)}`);
    if (!filePath.startsWith(repoRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": contentType(filePath) });
    if (filePath.endsWith(path.join("minigames", "index.html"))) {
      const html = fs.readFileSync(filePath, "utf8").replace(
        "<script>",
        `<script>window.MINIGAMES_API_BASE = window.location.origin;</script>\n  <script>`
      );
      response.end(html);
      return;
    }

    fs.createReadStream(filePath).pipe(response);
  });

  return { server, entriesByGameId };
}

function waitForServer(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function waitForDebugUrl(chrome) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome did not start remote debugging in time.")), 60000);
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
  const { server, entriesByGameId } = createStaticServer();
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
    "about:blank"
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
    await connection.send("Page.enable", {}, sessionId);
    await connection.send("Page.navigate", { url: targetUrl }, sessionId);
    const result = await connection.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const get = (id) => document.getElementById(id);
          let game = null;
          for (let attempt = 0; attempt < 200; attempt += 1) {
            try {
              if (typeof eventCatalog === "object" && Array.isArray(eventCatalog) && typeof normalizeGame === "function") {
                const catalogGame = eventCatalog.find((candidate) => candidate.id === ${JSON.stringify(expectedGameId)});
                if (catalogGame) {
                  game = normalizeGame(catalogGame, 0);
                  break;
                }
              }
            } catch {
              // The page is still initializing its catalog.
            }
            await wait(100);
          }
          if (!game) {
            throw new Error("No daily weather game was loaded.");
          }

          const bestPicks = game.questions.map((question, index) => {
            const best = getAnswers(question).reduce((winner, candidate) => {
              if (!winner || candidate.odds > winner.odds) {
                return candidate;
              }
              return winner;
            }, null);
            const questionId = getQuestionId(question, index);
            return [questionId, best.id];
          });
          const picks = Object.fromEntries(bestPicks);
          const entry = {
            name: "Weather Bot",
            picks,
            notify: "none",
            score: scorePicks(game, picks),
            savedAt: new Date().toISOString(),
          };

          playerNameEl.value = entry.name;
          playerNameEl.dispatchEvent(new Event("input", { bubbles: true }));
          state.playerName = entry.name;
          state.notify = entry.notify;
          saveState();

          const savedToServer = await saveEntryForScope(game, entry);
          if (!savedToServer) {
            throw new Error(
              "The daily weather save helper did not write to the test API server: " +
              JSON.stringify({
                lastSaveError: state.lastSaveError || "",
                scope: leaderboardScope(game),
                apiUrl: minigamesApiUrl(game.gameId),
              })
            );
          }

          const savedEntry = findSavedEntryForName(game, allEntries(game), entry.name);

          return {
            title: get("eventTitle")?.textContent || "",
            entryCount: get("entryCount")?.textContent || "",
            saveNote: get("saveNote")?.textContent || "",
            leaderboard: get("leaderboard")?.textContent || "",
            savedEntryName: savedEntry?.name || "",
            chosen: bestPicks.map(([, answerId]) => answerId),
            bestPicks,
            storedState: JSON.parse(localStorage.getItem("dexterbain-minigames-v1") || "{}")
          };
        })()
      `
    }, sessionId);

    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        "Browser test threw an exception"
      );
    }

    const value = result.result.value;
    if (value?.savedEntryName !== "Weather Bot") {
      throw new Error(`Weather Bot test did not save correctly: ${JSON.stringify(value)}`);
    }

    const savedEntry = [...entriesByGameId.values()].flat().find((entry) => entry.name === "Weather Bot");
    if (!savedEntry) {
      throw new Error("Weather Bot was not written to the test API server.");
    }

    const savedPickMap = savedEntry.picks || {};
    const bestPickMap = Object.fromEntries(value.bestPicks || []);
    if (JSON.stringify(savedPickMap) !== JSON.stringify(bestPickMap)) {
      throw new Error(`Saved picks did not match the best-odds answers: ${JSON.stringify({ savedPickMap, bestPickMap })}`);
    }

    if (value.savedEntryName !== "Weather Bot") {
      throw new Error(`Saved entry was not reflected back in the page state: ${JSON.stringify({ savedEntryName: value.savedEntryName })}`);
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
