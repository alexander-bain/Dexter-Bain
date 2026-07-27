const STORAGE_KEY = "dexters-vibe-lab-ideas-v01";

const form = document.querySelector("#ideaForm");
const generatedPrompt = document.querySelector("#generatedPrompt");
const copyPromptButton = document.querySelector("#copyPrompt");
const promptState = document.querySelector("#promptState");
const safetyMessage = document.querySelector("#safetyMessage");
const savedList = document.querySelector("#savedList");
const clearIdeasButton = document.querySelector("#clearIdeas");

const restrictedPatterns = [
  {
    label: "real money gambling",
    test: /\b(real money|cash bet|cash betting|bet money|crypto bet|crypto betting|wager|payout|casino for money|gambl(e|ing) for money)\b/i,
  },
  {
    label: "copied copyrighted characters",
    test: /\b(mario|pokemon|pikachu|disney|mickey|marvel|spider-?man|batman|sonic|zelda|minecraft|fortnite|star wars|harry potter|spongebob)\b/i,
  },
  {
    label: "unsafe or inappropriate games",
    test: /\b(sexual|porn|nude|hate crime|racist|slur|self-harm|suicide|terror|school shooting|mass shooting|doxx|drug dealing)\b/i,
  },
  {
    label: "automatic publishing",
    test: /\b(auto publish|automatically publish|publish without review|skip review|go live automatically|deploy automatically)\b/i,
  },
];

copyPromptButton.disabled = true;

function getSavedIdeas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function setSavedIdeas(ideas) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
}

function getFormData() {
  const data = new FormData(form);

  return {
    id: createIdeaId(),
    gameTitle: cleanValue(data.get("gameTitle")),
    basicIdea: cleanValue(data.get("basicIdea")),
    gameType: cleanValue(data.get("gameType")),
    visualStyle: cleanValue(data.get("visualStyle")),
    controls: cleanValue(data.get("controls")),
    device: cleanValue(data.get("device")),
    difficulty: cleanValue(data.get("difficulty")),
    specialFeature: cleanValue(data.get("specialFeature")),
    createdAt: new Date().toISOString(),
  };
}

function cleanValue(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function createIdeaId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function findSafetyIssue(idea) {
  const searchableText = Object.values(idea).join(" ");
  return restrictedPatterns.find((rule) => rule.test.test(searchableText));
}

function generatePrompt(idea) {
  const scopeLine = getScopeLine(idea.difficulty);
  const deviceLine = getDeviceLine(idea.device);

  return `You are Codex, acting as a senior game developer and careful product builder.

Build Version 0.1 of a browser game called "${idea.gameTitle}".

Game concept:
${idea.basicIdea}

Game type:
${idea.gameType}

Visual style:
${idea.visualStyle}

Controls:
${idea.controls}

Target device:
${deviceLine}

Difficulty target:
${scopeLine}

Special feature:
${idea.specialFeature}

Tech requirements:
- Use plain HTML, CSS, and JavaScript.
- Keep the project static and browser-based.
- Organize the code into clear sections or files.
- Make the game work on desktop, iPad, and phone when possible.
- Use responsive layout, readable text, and touch-friendly controls.
- Store only simple local game state in localStorage if needed.

Features to include:
- A playable first version with a clear start state, active gameplay, and end state.
- A short title screen or intro panel.
- A score, timer, lives, progress, or similar feedback that matches the idea.
- Simple visual polish, motion, and sound placeholders only if they are easy to keep clean.
- The special feature above as a visible part of Version 0.1.

Do not add yet:
- Do not connect real AI.
- Do not use paid APIs.
- Do not add accounts, payments, ads, real money gambling, crypto, or NFTs.
- Do not copy copyrighted characters, worlds, logos, or brands.
- Do not include unsafe, hateful, sexual, or inappropriate content.
- Do not auto-publish or deploy the game.

Code quality:
- Keep the code beginner-friendly and easy to read.
- Use meaningful names for functions, variables, and UI elements.
- Separate setup, input handling, game state, rendering, and restart logic.
- Avoid unnecessary frameworks, build tools, or dependencies.
- Add short comments only where they help explain important logic.
- Finish with a brief explanation of how to run the game locally and what to improve in Version 0.2.`;
}

function getScopeLine(difficulty) {
  const scope = {
    simple: "Simple: keep the first version small, polished, and easy to finish.",
    medium: "Medium: add a few satisfying mechanics while keeping the code manageable.",
    ambitious: "Ambitious: make it feel impressive, but still ship a stable Version 0.1.",
  };

  return scope[difficulty] || scope.simple;
}

function getDeviceLine(device) {
  const devices = {
    desktop: "Desktop browsers with keyboard or mouse controls.",
    iPad: "iPad Safari with large touch targets and comfortable portrait/landscape support.",
    phone: "Phone browsers with thumb-friendly controls and compact layout.",
    all: "Desktop, iPad, and phone with responsive controls.",
  };

  return devices[device] || devices.all;
}

function saveIdea(idea, prompt) {
  const ideas = getSavedIdeas();
  const savedIdea = {
    ...idea,
    prompt,
  };

  ideas.unshift(savedIdea);
  setSavedIdeas(ideas.slice(0, 20));
  renderSavedIdeas();
}

function renderSavedIdeas() {
  const ideas = getSavedIdeas();
  savedList.innerHTML = "";

  if (!ideas.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No saved ideas yet.";
    savedList.append(empty);
    return;
  }

  ideas.forEach((idea) => {
    const card = document.createElement("article");
    card.className = "saved-card";

    const title = document.createElement("h3");
    title.textContent = idea.gameTitle;

    const meta = document.createElement("div");
    meta.className = "saved-meta";
    meta.innerHTML = `
      <span>${escapeHtml(idea.gameType)}</span>
      <span>${escapeHtml(idea.device)}</span>
      <span>${escapeHtml(idea.difficulty)}</span>
    `;

    const description = document.createElement("p");
    description.textContent = idea.basicIdea;

    const actions = document.createElement("div");
    actions.className = "saved-actions";

    const loadButton = document.createElement("button");
    loadButton.className = "small-button";
    loadButton.type = "button";
    loadButton.textContent = "Load";
    loadButton.addEventListener("click", () => loadSavedIdea(idea));

    const copyButton = document.createElement("button");
    copyButton.className = "small-button";
    copyButton.type = "button";
    copyButton.textContent = "Copy Prompt";
    copyButton.addEventListener("click", () => copyText(idea.prompt, copyButton));

    actions.append(loadButton, copyButton);
    card.append(meta, title, description, actions);
    savedList.append(card);
  });
}

function loadSavedIdea(idea) {
  generatedPrompt.value = idea.prompt;
  promptState.textContent = "Loaded";
  copyPromptButton.disabled = false;
  safetyMessage.textContent = `Loaded "${idea.gameTitle}" from saved ideas.`;
  safetyMessage.classList.remove("is-error");
  document.querySelector("#promptTitle").scrollIntoView({ behavior: "smooth", block: "start" });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function copyText(text, button) {
  if (!text.trim()) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    flashButton(button, "Copied");
  } catch (error) {
    generatedPrompt.value = text;
    promptState.textContent = "Selected";
    generatedPrompt.focus();
    generatedPrompt.select();
    flashButton(button, "Select Prompt");
  }
}

function flashButton(button, label) {
  const originalLabel = button.textContent;
  button.textContent = label;
  window.setTimeout(() => {
    button.textContent = originalLabel;
  }, 1400);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const idea = getFormData();
  const issue = findSafetyIssue(idea);

  if (issue) {
    promptState.textContent = "Blocked";
    safetyMessage.textContent = `This idea was not saved because it appears to include ${issue.label}.`;
    safetyMessage.classList.add("is-error");
    return;
  }

  const prompt = generatePrompt(idea);
  generatedPrompt.value = prompt;
  promptState.textContent = "Ready";
  copyPromptButton.disabled = false;
  safetyMessage.textContent = "Prompt created and saved for review.";
  safetyMessage.classList.remove("is-error");
  saveIdea(idea, prompt);
});

copyPromptButton.addEventListener("click", () => {
  copyText(generatedPrompt.value, copyPromptButton);
});

clearIdeasButton.addEventListener("click", () => {
  const ideas = getSavedIdeas();

  if (!ideas.length) {
    return;
  }

  const shouldClear = window.confirm("Clear all saved ideas from this device?");

  if (shouldClear) {
    setSavedIdeas([]);
    renderSavedIdeas();
    safetyMessage.textContent = "Saved ideas cleared from this device.";
    safetyMessage.classList.remove("is-error");
  }
});

renderSavedIdeas();
