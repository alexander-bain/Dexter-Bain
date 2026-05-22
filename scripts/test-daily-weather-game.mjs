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

function createStaticServer() {
  const entriesByGameId = new Map();

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");

    const entriesMatch = url.pathname.match(/^\/api\/minigames\/([^/]+)\/entries$/);
    const resultsMatch = url.pathname.match(/^\/api\/minigames\/([^/]+)\/results$/);
    const resultsCheckMatch = url.pathname.match(/^\/api\/minigames\/([^/]+)\/results\/check$/);

    if (request.method === "GET" && entriesMatch) {
      const gameId = decodeURIComponent(entriesMatch[1]);
      response.writeHead(200, { "Content-Type": "application/json" });
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
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ gameId, entries: currentEntries }));
      return;
    }

    if (request.method === "GET" && resultsMatch) {
      const gameId = decodeURIComponent(resultsMatch[1]);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ gameId, results: [] }));
      return;
    }

    if (request.method === "POST" && resultsCheckMatch) {
      const gameId = decodeURIComponent(resultsCheckMatch[1]);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ gameId, results: [] }));
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
        `<script>window.MINIGAMES_SUPABASE_URL = ""; window.MINIGAMES_SUPABASE_KEY = ""; window.MINIGAMES_API_BASE = window.location.origin;</script>\n  <script>`
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

function seededRandom(seed) {
  let value = 2166136261;
  for (const char of String(seed)) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function weatherBotPick(question, index, getAnswers) {
  const answers = getAnswers(question);
  const fallback = answers.reduce((winner, candidate) => {
    if (!winner || candidate.odds > winner.odds) {
      return candidate;
    }
    return winner;
  }, null);
  if (!answers.length) {
    return null;
  }
  if (answers.length === 1) {
    return answers[0];
  }

  const random = seededRandom(`${question.id || question.text || "question"}:${index}`);
  const weighted = answers.map((answer) => ({
    answer,
    weight: Math.max(1, Math.round((answer.odds || 1) * Math.sqrt(answer.points || 1)))
  }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let bucket = random() * total;
  for (const entry of weighted) {
    bucket -= entry.weight;
    if (bucket <= 0) {
      return entry.answer;
    }
  }
  return fallback || answers[answers.length - 1];
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
    targetUrl
  ], { stdio: ["ignore", "ignore", "pipe"] });

  let connection;
  try {
    const wsUrl = await waitForDebugUrl(chrome);
    connection = cdpConnection(wsUrl);
    let page = null;
    for (let attempt = 0; attempt < 600; attempt += 1) {
      const targets = await connection.send("Target.getTargets");
      page = targets.targetInfos.find((target) => target.type === "page" && target.url === targetUrl)
        || targets.targetInfos.find((target) => target.type === "page" && target.url.startsWith(targetUrl))
        || targets.targetInfos.find((target) => target.type === "page");
      if (page?.url && page.url !== "about:blank") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!page) throw new Error("No Chrome page target found.");

    const { sessionId } = await connection.send("Target.attachToTarget", {
      targetId: page.targetId,
      flatten: true
    });

    await connection.send("Page.enable", {}, sessionId);
    await connection.send("Runtime.enable", {}, sessionId);

    for (let attempt = 0; attempt < 200; attempt += 1) {
      const ready = await connection.send("Runtime.evaluate", {
        returnByValue: true,
        expression: '(() => { try { return typeof MINIGAMES_TEST === "object" && typeof MINIGAMES_TEST.getUpcomingGames === "function" && Array.isArray(MINIGAMES_TEST.getUpcomingGames()) && MINIGAMES_TEST.getUpcomingGames().length > 0; } catch { return false; } })()'
      }, sessionId);
      if (ready.result?.value === true) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (attempt === 599) {
        throw new Error("The minigames page did not finish booting in time.");
      }
    }

    const result = await connection.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const seededRandom = ${seededRandom.toString()};
          const weatherBotPick = ${weatherBotPick.toString()};
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const test = MINIGAMES_TEST;
          const game = test.getUpcomingGames().find((candidate) => candidate.gameId.startsWith("daily-weather-"));
          if (!game) {
            throw new Error("No daily weather game was loaded.");
          }

          test.setSelectedGameId(game.gameId);
          test.render();

          const botPicks = game.questions.map((question, index) => {
            const choice = weatherBotPick(question, index, test.getAnswers);
            return [test.getQuestionId(question, index), choice.id];
          });
          const picks = Object.fromEntries(botPicks);
          const favoritePicks = game.questions.map((question, index) => {
            const answers = test.getAnswers(question).slice().sort((left, right) => right.odds - left.odds || left.points - right.points);
            return [test.getQuestionId(question, index), answers[0].id];
          });
          const entry = {
            name: "Weather Bot",
            picks,
            notify: "none",
            score: test.scorePicks(game, picks),
            savedAt: new Date().toISOString(),
          };
          const chalkEntry = {
            name: "Forecast Favorite",
            picks: Object.fromEntries(favoritePicks),
            notify: "none",
            score: test.scorePicks(game, Object.fromEntries(favoritePicks)),
            savedAt: new Date().toISOString(),
          };

          test.playerNameEl.value = entry.name;
          test.playerNameEl.dispatchEvent(new Event("input", { bubbles: true }));
          test.state.playerName = entry.name;
          test.state.notify = entry.notify;
          test.saveState();

          const savedToServer = await test.saveEntryForScope(game, entry);
          const chalkSaved = await test.saveEntryForScope(game, chalkEntry);
          if (!savedToServer || !chalkSaved) {
            throw new Error(
              "The daily weather save helper did not write to the test API server: " +
              JSON.stringify({ lastSaveError: test.state.lastSaveError || "", apiUrl: "/api/minigames/" + encodeURIComponent(game.gameId) + "/entries" })
            );
          }

          test.render();
          const start = Date.now();
          while (Date.now() - start < 15000) {
            const saveNote = document.getElementById("saveNote")?.textContent || "";
            const leaderboard = document.getElementById("leaderboard")?.textContent || "";
            const weatherBotButton = document.querySelector('[data-leader-name="Weather Bot"]');
            if (weatherBotButton && weatherBotButton.getAttribute("aria-pressed") !== "true") {
              weatherBotButton.click();
              await wait(50);
            }
            const leaderboardDetails = document.getElementById("leaderboardPicks")?.textContent || "";
            const entryCount = document.getElementById("entryCount")?.textContent || "";
            const storage = JSON.parse(localStorage.getItem("dexterbain-minigames-v1") || "{}");
            if (
              saveNote.includes("Weather Bot") &&
              leaderboard.includes("Weather Bot") &&
              leaderboard.includes("Forecast Favorite") &&
              leaderboard.includes("max possible") &&
              leaderboard.includes("win") &&
              leaderboardDetails.includes("Weather Bot") &&
              leaderboardDetails.includes("chance to win") &&
              leaderboardDetails.includes("max possible pts") &&
              Number.parseInt(entryCount, 10) >= 2 &&
              storage.playerName === "Weather Bot"
            ) {
              return {
                title: document.getElementById("eventTitle")?.textContent || "",
                entryCount,
                saveNote,
                leaderboard,
                leaderboardDetails,
                savedEntryName: storage.playerName || "",
                botPicks,
                favoritePicks,
                storedState: storage,
              };
            }
            await wait(100);
          }

          throw new Error(
            "Saved state did not become visible in time: " +
            JSON.stringify({
              saveNote: document.getElementById("saveNote")?.textContent || "",
              leaderboard: document.getElementById("leaderboard")?.textContent || "",
              leaderboardDetails: document.getElementById("leaderboardPicks")?.textContent || "",
              entryCount: document.getElementById("entryCount")?.textContent || "",
              storage: JSON.parse(localStorage.getItem("dexterbain-minigames-v1") || "{}"),
            })
          );
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

    const botPickMap = Object.fromEntries(value.botPicks || []);
    const favoritePickMap = Object.fromEntries(value.favoritePicks || []);
    if (!Object.keys(botPickMap).length) {
      throw new Error(`Weather Bot picks were empty: ${JSON.stringify(value)}`);
    }
    if (JSON.stringify(botPickMap) === JSON.stringify(favoritePickMap)) {
      throw new Error(`Weather Bot still matched the favorite picks: ${JSON.stringify({ botPickMap, favoritePickMap })}`);
    }

    const sourceHtml = fs.readFileSync(path.join(repoRoot, "minigames", "index.html"), "utf8");
    const answerBlocks = [...sourceHtml.matchAll(/question\("([^"]+)", \[\s*([\s\S]*?)\s*\], "(\d{8}-[^"]+)"/g)];
    const favoriteByQuestionId = Object.fromEntries(answerBlocks.map(([, , rawAnswers, questionId]) => {
      const answers = [...rawAnswers.matchAll(/answer\("([^"]+)",\s*(\d+),\s*"([^"]+)"/g)].map((match) => ({
        label: match[1],
        odds: Number(match[2]),
        id: match[3],
      }));
      answers.sort((left, right) => right.odds - left.odds);
      return [questionId, answers[0]?.id || ""];
    }));
    const pickedQuestionIds = Object.keys(botPickMap);
    const nonFavoriteCount = pickedQuestionIds.filter((questionId) => botPickMap[questionId] && favoriteByQuestionId[questionId] && botPickMap[questionId] !== favoriteByQuestionId[questionId]).length;
    if (pickedQuestionIds.length > 1 && nonFavoriteCount === 0) {
      throw new Error(`Weather Bot only picked favorites: ${JSON.stringify({ botPickMap, favoriteByQuestionId })}`);
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
