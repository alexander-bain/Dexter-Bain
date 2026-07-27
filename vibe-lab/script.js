const STORAGE_KEY = "dexters-vibe-lab-ideas-v01";

const form = document.querySelector("#ideaForm");
const ideaInput = document.querySelector("#ideaInput");
const promptDialog = document.querySelector("#promptDialog");
const generatedPrompt = document.querySelector("#generatedPrompt");
const copyPromptButton = document.querySelector("#copyPrompt");
const closeDialogButton = document.querySelector("#closeDialog");
const toast = document.querySelector("#toast");

const restrictedPatterns = [
  {
    label: "real-money gambling",
    test: /\b(real money|cash bet|bet money|crypto bet|wager|cash payout|gambling for money)\b/i,
  },
  {
    label: "a copied copyrighted character or brand",
    test: /\b(mario|pokemon|pikachu|disney|mickey|marvel|spider-?man|batman|sonic|zelda|minecraft|fortnite|star wars|harry potter|spongebob)\b/i,
  },
  {
    label: "unsafe or inappropriate content",
    test: /\b(porn|sexual game|hate crime|racist game|self-harm|school shooting|mass shooting|doxx)\b/i,
  },
  {
    label: "automatic publishing",
    test: /\b(auto publish|automatically publish|publish without review|skip review|deploy automatically)\b/i,
  },
];

let toastTimer;

function cleanIdea(value) {
  return String(value || "").trim().replace(/\n{3,}/g, "\n\n");
}

function findSafetyIssue(idea) {
  return restrictedPatterns.find((rule) => rule.test.test(idea));
}

function createPrompt(idea) {
  return `You are Codex, acting as a senior game developer and thoughtful product designer.

Build Version 0.1 of a polished browser game based on this idea:

"${idea}"

First, interpret the idea and make sensible beginner-friendly decisions about the game type, visual style, controls, and scope. Do not stop to ask questions unless a missing detail truly prevents the game from working.

Build requirements:
- Use plain HTML, CSS, and JavaScript.
- Make the game playable as a static website.
- Support desktop, iPad, and phone with responsive, touch-friendly controls.
- Include a clear start state, active gameplay, feedback such as score or progress, an end state, and a restart action.
- Give the game a distinct visual identity that fits the idea.
- Keep Version 0.1 focused, satisfying, and realistic to finish.

Do not add yet:
- No real AI connections or AI-generated content.
- No paid APIs, accounts, payments, ads, crypto, NFTs, or real-money gambling.
- No copied copyrighted characters, logos, brands, worlds, or music.
- No unsafe, hateful, sexual, or inappropriate content.
- No automatic publishing or deployment.

Code quality:
- Organize the project as index.html, styles.css, and script.js.
- Use clear names and small, focused functions.
- Keep game state, input, updates, rendering, and restart logic easy to follow.
- Avoid unnecessary frameworks, build tools, and dependencies.
- Add comments only where they explain important logic.
- Make sure the layout does not overlap or break on small screens.
- Test the main game flow before finishing.

At the end, briefly explain what was built, how to run it, and what Version 0.2 should add next.`;
}

function getSavedIdeas() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveIdea(idea, prompt) {
  const savedIdeas = getSavedIdeas();
  const record = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    gameTitle: idea.slice(0, 64),
    basicIdea: idea,
    gameType: "chat",
    device: "all",
    difficulty: "simple",
    prompt,
    createdAt: new Date().toISOString(),
  };

  savedIdeas.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedIdeas.slice(0, 20)));
}

function resizeInput() {
  ideaInput.style.height = "auto";
  ideaInput.style.height = `${Math.min(ideaInput.scrollHeight, 190)}px`;
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2800);
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(generatedPrompt.value);
    copyPromptButton.textContent = "Copied";
    showToast("Prompt copied.");
  } catch {
    generatedPrompt.focus();
    generatedPrompt.select();
    copyPromptButton.textContent = "Prompt selected";
    showToast("Press Copy to copy the selected prompt.");
  }

  window.setTimeout(() => {
    copyPromptButton.textContent = "Copy Prompt";
  }, 1600);
}

function openPrompt(prompt) {
  generatedPrompt.value = prompt;

  if (typeof promptDialog.showModal === "function") {
    promptDialog.showModal();
  } else {
    promptDialog.setAttribute("open", "");
  }
}

function closePrompt() {
  promptDialog.close();
  ideaInput.focus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const idea = cleanIdea(ideaInput.value);

  if (!idea) {
    ideaInput.focus();
    return;
  }

  const issue = findSafetyIssue(idea);
  if (issue) {
    showToast(`Please remove ${issue.label} and try again.`, true);
    return;
  }

  const prompt = createPrompt(idea);
  saveIdea(idea, prompt);
  openPrompt(prompt);
});

ideaInput.addEventListener("input", resizeInput);

ideaInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});

copyPromptButton.addEventListener("click", copyPrompt);
closeDialogButton.addEventListener("click", closePrompt);

promptDialog.addEventListener("click", (event) => {
  if (event.target === promptDialog) {
    closePrompt();
  }
});

promptDialog.addEventListener("cancel", () => {
  window.setTimeout(() => ideaInput.focus(), 0);
});
