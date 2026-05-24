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
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const test = MINIGAMES_TEST;
          const game = test.getUpcomingGames().find((candidate) => candidate.gameId.startsWith("daily-weather-"));
          if (!game) {
            throw new Error("No daily weather game was loaded.");
          }

          test.setSelectedGameId(game.gameId);
          test.render();

          const questionModels = game.questions.map((question, index) => {
            const answers = test.getAnswers(question).slice();
            return {
              index,
              id: test.getQuestionId(question, index),
              answers,
            };
          });
          const favoritePicks = questionModels.map((question) => {
            const favorite = question.answers.reduce((winner, candidate) => {
              if (!winner || candidate.odds > winner.odds || (candidate.odds === winner.odds && candidate.points < winner.points)) {
                return candidate;
              }
              return winner;
            }, null);
            return [question.id, favorite.id];
          });
          const favoritePickMap = Object.fromEntries(favoritePicks);
          const seededRandom = (seed) => {
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
          };
          const weightedRandomAnswer = (answers, randomValue) => {
            const totalOdds = answers.reduce((total, answerOption) => total + (Number(answerOption.odds) || 0), 0) || 1;
            let cursor = randomValue * totalOdds;
            for (const answerOption of answers) {
              cursor -= Number(answerOption.odds) || 0;
              if (cursor <= 0) {
                return answerOption;
              }
            }
            return answers[answers.length - 1];
          };
          const randomForLineups = seededRandom(game.gameId + ":weather-bot");
          const scoredLineups = [];
          const buildCandidates = (question) => {
            const favoriteId = favoritePickMap[question.id];
            const byLeverage = question.answers
              .slice()
              .sort((left, right) => {
                const leftScore = (100 - left.odds) * left.points;
                const rightScore = (100 - right.odds) * right.points;
                return rightScore - leftScore || right.odds - left.odds;
              })
              .map((answer) => answer.id);
            return [favoriteId, ...byLeverage].filter((answerId, index, values) => answerId && values.indexOf(answerId) === index).slice(0, 3);
          };
          const lineups = [[]];
          questionModels.forEach((question) => {
            const next = [];
            const candidates = buildCandidates(question);
            lineups.forEach((lineup) => {
              candidates.forEach((answerId) => {
                next.push([...lineup, [question.id, answerId]]);
              });
            });
            lineups.splice(0, lineups.length, ...next.slice(0, 729));
          });
          const scoreCandidateLineup = (picks) => {
            const pickMap = Object.fromEntries(picks);
            const chalkLineups = [
              favoritePickMap,
              Object.fromEntries(questionModels.map((question) => {
                const sorted = question.answers.slice().sort((left, right) => right.odds - left.odds || left.points - right.points);
                return [question.id, (sorted[1] || sorted[0]).id];
              })),
              Object.fromEntries(questionModels.map((question, index) => {
                const sorted = question.answers.slice().sort((left, right) => right.odds - left.odds || left.points - right.points);
                return [question.id, (sorted[Math.min(index % 3, sorted.length - 1)] || sorted[0]).id];
              })),
            ];
            let winShare = 0;
            let expectedScore = 0;
            let leverageCount = 0;
            const simulations = 2400;

            questionModels.forEach((question) => {
              if (pickMap[question.id] !== favoritePickMap[question.id]) {
                leverageCount += 1;
              }
            });

            for (let simulation = 0; simulation < simulations; simulation += 1) {
              let botScore = 0;
              const fieldScores = new Array(chalkLineups.length).fill(0);

              questionModels.forEach((question) => {
                const winner = weightedRandomAnswer(question.answers, randomForLineups());
                if (pickMap[question.id] === winner.id) {
                  botScore += winner.points;
                }
                chalkLineups.forEach((fieldLineup, fieldIndex) => {
                  if (fieldLineup[question.id] === winner.id) {
                    fieldScores[fieldIndex] += winner.points;
                  }
                });
              });

              expectedScore += botScore;
              const topScore = Math.max(botScore, ...fieldScores);
              const tiedFieldWinners = fieldScores.filter((score) => score === topScore && botScore === topScore).length;
              if (botScore === topScore) {
                winShare += 1 / (1 + tiedFieldWinners);
              }
            }

            return {
              picks,
              winRate: winShare / simulations,
              expectedScore: expectedScore / simulations,
              leverageCount,
            };
          };
          lineups.forEach((lineup) => {
            scoredLineups.push(scoreCandidateLineup(lineup));
          });
          scoredLineups.sort((left, right) => (
            right.winRate - left.winRate ||
            right.expectedScore - left.expectedScore ||
            right.leverageCount - left.leverageCount
          ));
          const botPicks = scoredLineups[0]?.picks || favoritePicks;
          const picks = Object.fromEntries(botPicks);
          const usedRiskPick = botPicks.some(([questionId, answerId]) => favoritePickMap[questionId] !== answerId);
          if (!usedRiskPick) {
            throw new Error("Weather Bot only picked favorites.");
          }
          const entry = {
            name: "Weather Bot",
            picks,
            notify: "none",
            score: test.scorePicks(game, picks),
            savedAt: new Date().toISOString(),
          };

          test.playerNameEl.value = entry.name;
          test.playerNameEl.dispatchEvent(new Event("input", { bubbles: true }));
          test.state.playerName = entry.name;
          test.state.notify = entry.notify;
          test.saveState();

          const savedToServer = await test.saveEntryForScope(game, entry);
          if (!savedToServer) {
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
            const entryCount = document.getElementById("entryCount")?.textContent || "";
            const leaderButton = document.querySelector('[data-leader-name="Weather Bot"]');
            if (leaderButton) {
              leaderButton.click();
            }
            const pickView = document.getElementById("leaderboardPicks")?.textContent || "";
            const storage = JSON.parse(localStorage.getItem("dexterbain-minigames-v1") || "{}");
            if (
              saveNote.includes("Weather Bot") &&
              leaderboard.includes("Weather Bot") &&
              leaderboard.includes("100% chance to win") &&
              leaderboard.includes("max from picks") &&
              pickView.includes("chance to win") &&
              pickView.includes("max from picks") &&
              entryCount.trim() === "1" &&
              storage.playerName === "Weather Bot"
            ) {
              return {
                title: document.getElementById("eventTitle")?.textContent || "",
                entryCount,
                saveNote,
                leaderboard,
                pickView,
                savedEntryName: storage.playerName || "",
                chosen: botPicks.map(([, answerId]) => answerId),
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
              pickView: document.getElementById("leaderboardPicks")?.textContent || "",
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
    if (!Object.keys(botPickMap).some((questionId) => botPickMap[questionId] !== favoritePickMap[questionId])) {
      throw new Error(`Saved picks only used favorites: ${JSON.stringify({ botPickMap, favoritePickMap })}`);
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
