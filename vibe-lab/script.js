const PROJECTS_KEY = "dexters-vibe-lab-projects-v2";
const SETTINGS_KEY = "dexters-vibe-lab-settings-v2";
const CURRENT_PROJECT_KEY = "dexters-vibe-lab-current-v2";
const LEGACY_KEY = "dexters-vibe-lab-ideas-v01";

const PROCESS_STEPS = [
  {
    title: "Understand idea",
    pending: "Waiting for your project idea.",
  },
  {
    title: "Ask missing questions",
    pending: "Checking for important gaps.",
  },
  {
    title: "Choose project type",
    pending: "Game, website, app, or self-edit.",
  },
  {
    title: "Make feature list",
    pending: "Turning the idea into clear parts.",
  },
  {
    title: "Make safety limits",
    pending: "Setting safe Version 2 boundaries.",
  },
  {
    title: "Create Codex prompt",
    pending: "Preparing a clean build handoff.",
  },
  {
    title: "Save project",
    pending: "Ready to save on this device.",
  },
  {
    title: "Suggest next version",
    pending: "Planning what could come later.",
  },
];

const SAFETY_LIMITS = [
  "Never delete a project without confirmation.",
  "Never overwrite a project without preserving an undo version.",
  "Never place API keys, secrets, or paid service credentials in browser code.",
  "Never execute random generated code directly in the workspace.",
  "Keep all AI behavior simulated until a secure backend is added.",
  "Never publish or deploy automatically.",
];

const restrictedPatterns = [
  {
    label: "real-money gambling",
    test: /\b(real money|cash bet|bet money|crypto bet|wager|cash payout|gambling for money)\b/i,
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

const elements = {
  body: document.body,
  commandToggle: document.querySelector("#commandToggle"),
  commandBar: document.querySelector("#commandBar"),
  commandActions: document.querySelector(".command-actions"),
  sidebarToggle: document.querySelector("#sidebarToggle"),
  sidebarBackdrop: document.querySelector("#sidebarBackdrop"),
  projectSidebar: document.querySelector("#projectSidebar"),
  newProjectButton: document.querySelector("#newProjectButton"),
  projectList: document.querySelector("#projectList"),
  headerProjectName: document.querySelector("#headerProjectName"),
  workspaceTitle: document.querySelector("#workspaceTitle"),
  workspaceSummary: document.querySelector("#workspaceSummary"),
  modeBadge: document.querySelector("#modeBadge"),
  contextLabel: document.querySelector("#contextLabel"),
  improveProjectButton: document.querySelector("#improveProjectButton"),
  ideaForm: document.querySelector("#ideaForm"),
  ideaInput: document.querySelector("#ideaInput"),
  characterCount: document.querySelector("#characterCount"),
  submitIdea: document.querySelector("#submitIdea"),
  processGrid: document.querySelector("#processGrid"),
  progressNumber: document.querySelector("#progressNumber"),
  progressTrack: document.querySelector("#progressTrack"),
  progressFill: document.querySelector("#progressFill"),
  briefSection: document.querySelector("#briefSection"),
  briefName: document.querySelector("#briefName"),
  briefStatus: document.querySelector("#briefStatus"),
  briefGoal: document.querySelector("#briefGoal"),
  briefDesign: document.querySelector("#briefDesign"),
  briefFeatures: document.querySelector("#briefFeatures"),
  briefFiles: document.querySelector("#briefFiles"),
  selfEditSection: document.querySelector("#selfEditSection"),
  riskBadge: document.querySelector("#riskBadge"),
  requestedChange: document.querySelector("#requestedChange"),
  plannedChanges: document.querySelector("#plannedChanges"),
  affectedSections: document.querySelector("#affectedSections"),
  checkpointText: document.querySelector("#checkpointText"),
  changePreview: document.querySelector(".change-preview"),
  previewCaption: document.querySelector("#previewCaption"),
  cancelChange: document.querySelector("#cancelChange"),
  applyChange: document.querySelector("#applyChange"),
  resultsGrid: document.querySelector("#resultsGrid"),
  promptVersion: document.querySelector("#promptVersion"),
  generatedPrompt: document.querySelector("#generatedPrompt"),
  copyPrompt: document.querySelector("#copyPrompt"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  nextVersion: document.querySelector("#nextVersion"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  defaultDevice: document.querySelector("#defaultDevice"),
  compactMode: document.querySelector("#compactMode"),
  focusPrompt: document.querySelector("#focusPrompt"),
  toast: document.querySelector("#toast"),
};

let projects = [];
let currentProjectId = null;
let settings = loadSettings();
let activeRun = 0;
let toastTimer = 0;

function makeId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanText(value) {
  return String(value || "").trim().replace(/\n{3,}/g, "\n\n");
}

function loadProjects() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROJECTS_KEY));
    if (Array.isArray(saved)) {
      return saved.map(normalizeProject).filter(Boolean);
    }
  } catch {
    return [];
  }

  return migrateLegacyProjects();
}

function normalizeProject(project) {
  if (!project || typeof project !== "object" || !project.id) {
    return null;
  }

  const normalized = {
    id: String(project.id),
    name: cleanText(project.name) || "Untitled Project",
    type: ["game", "website", "app", "self-edit"].includes(project.type)
      ? project.type
      : "app",
    status: cleanText(project.status) || "idea",
    idea: cleanText(project.idea),
    goal: cleanText(project.goal),
    features: Array.isArray(project.features) ? project.features.map(cleanText).filter(Boolean) : [],
    designStyle: cleanText(project.designStyle) || "Clean, modern, and beginner-friendly.",
    files: Array.isArray(project.files) && project.files.length
      ? project.files.map(cleanText).filter(Boolean)
      : ["index.html", "styles.css", "script.js"],
    safetyLimits: Array.isArray(project.safetyLimits) && project.safetyLimits.length
      ? project.safetyLimits.map(cleanText).filter(Boolean)
      : [...SAFETY_LIMITS],
    prompt: String(project.prompt || ""),
    versionNumber: Math.max(1, Number(project.versionNumber) || 1),
    nextVersion: cleanText(project.nextVersion) || "Test the first version, then improve the strongest interaction.",
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
    versions: Array.isArray(project.versions) ? project.versions : [],
    selfEditPlan: project.selfEditPlan || null,
    approvalState: project.approvalState || "draft",
  };

  if (!normalized.versions.length) {
    normalized.versions = [createVersionEntry(normalized, "Initial project plan")];
  }

  return normalized;
}

function migrateLegacyProjects() {
  let legacy = [];

  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY));
    legacy = Array.isArray(parsed) ? parsed : [];
  } catch {
    legacy = [];
  }

  const migrated = legacy.map((item) => {
    const idea = cleanText(item.basicIdea || item.gameTitle || "Imported game idea");
    const base = buildProjectDraft(idea, null, false);
    base.id = item.id || makeId();
    base.name = cleanText(item.gameTitle) || base.name;
    base.type = "game";
    base.status = item.prompt ? "ready for Codex" : "idea";
    base.prompt = item.prompt || createCodexPrompt(base);
    base.createdAt = item.createdAt || base.createdAt;
    base.updatedAt = item.createdAt || base.updatedAt;
    base.versions = [createVersionEntry(base, "Imported from Version 1")];
    return base;
  });

  if (migrated.length) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(migrated));
  }

  return migrated;
}

function saveProjects() {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

  if (currentProjectId) {
    localStorage.setItem(CURRENT_PROJECT_KEY, currentProjectId);
  } else {
    localStorage.removeItem(CURRENT_PROJECT_KEY);
  }
}

function loadSettings() {
  const defaults = {
    defaultDevice: "all",
    compactMode: false,
    focusPrompt: true,
  };

  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem(SETTINGS_KEY)),
    };
  } catch {
    return defaults;
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applySettings();
}

function applySettings() {
  elements.body.classList.toggle("compact", Boolean(settings.compactMode));
  elements.defaultDevice.value = settings.defaultDevice;
  elements.compactMode.checked = Boolean(settings.compactMode);
  elements.focusPrompt.checked = Boolean(settings.focusPrompt);
}

function getCurrentProject() {
  return projects.find((project) => project.id === currentProjectId) || null;
}

function findSafetyIssue(idea) {
  return restrictedPatterns.find((rule) => rule.test.test(idea));
}

function detectProjectType(idea) {
  const text = idea.toLowerCase();

  if (isSelfEditRequest(text)) {
    return "self-edit";
  }

  if (/\b(game|level|score|player|arcade|basketball|soccer|puzzle|simulator|racing|platformer)\b/.test(text)) {
    return "game";
  }

  if (/\b(website|site|homepage|portfolio|landing page|web page|blog)\b/.test(text)) {
    return "website";
  }

  return "app";
}

function isSelfEditRequest(text) {
  const explicitPlatform = /\b(vibe lab|vibe-lab|this platform|the platform|this workspace|dexter'?s website)\b/.test(text);
  const explicitPage = /\b(this website|this site|homepage layout|prompt box|project sidebar|command bar|swipe-down|settings page)\b/.test(text);
  const platformAction = /\b(add|change|make|remove|improve|redesign|resize|move|edit)\b/.test(text);

  return explicitPlatform || (explicitPage && platformAction);
}

function titleFromIdea(idea, type) {
  if (type === "self-edit") {
    return "Dexter's Vibe Lab";
  }

  const namedMatch = idea.match(/\b(?:called|named|title(?:d)?)\s+["']?([^".,\n]{2,48})/i);
  if (namedMatch) {
    return toTitleCase(namedMatch[1]);
  }

  const simplified = idea
    .replace(/^(please\s+)?(make|build|create|design|improve|help me make|i want)\s+(me\s+)?/i, "")
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/[.!?].*$/, "")
    .trim();
  const words = simplified.split(/\s+/).filter(Boolean).slice(0, 6);

  return toTitleCase(words.join(" ") || `New ${type}`);
}

function toTitleCase(value) {
  return String(value)
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function inferDesignStyle(idea, type) {
  const text = idea.toLowerCase();

  if (/\b(neon|cyber|glow)\b/.test(text)) {
    return "Crisp neon accents, dark play surfaces, and high-contrast readable controls.";
  }

  if (/\b(retro|pixel|8-bit)\b/.test(text)) {
    return "A restrained retro arcade style with pixel-inspired details and modern usability.";
  }

  if (/\b(cozy|calm|soft)\b/.test(text)) {
    return "Soft, calm colors, gentle motion, and comfortable spacing.";
  }

  if (/\b(3d|three.js)\b/.test(text)) {
    return "A focused 3D scene with a practical interface, strong depth cues, and responsive framing.";
  }

  if (type === "game") {
    return "Colorful, polished game presentation with readable feedback and responsive controls.";
  }

  if (type === "self-edit") {
    return "Keep Dexter's Vibe Lab modern, compact, calm, and easy for beginners to understand.";
  }

  return "Clean, modern, professional layout with clear hierarchy, friendly color, and no clutter.";
}

function inferFeatures(idea, type) {
  const features = [];
  const text = idea.toLowerCase();

  features.push(`Core request: ${idea}`);

  if (type === "game") {
    features.push("Clear start, active gameplay, result, and restart states");
    features.push("Visible score, progress, or performance feedback");
    features.push("Keyboard, pointer, and touch-friendly controls where appropriate");
  } else if (type === "website") {
    features.push("Responsive page structure with clear navigation and content hierarchy");
    features.push("Polished interactive states for buttons, forms, and mobile layouts");
    features.push("Accessible labels, readable typography, and useful empty states");
  } else if (type === "app") {
    features.push("A complete primary workflow from input to useful result");
    features.push("Clear state, feedback, empty states, and reversible actions");
    features.push("Responsive controls suited to desktop, iPad, and phone");
  } else {
    features.push("A reviewable Change Plan before any implementation");
    features.push("Affected-file list, risk level, and simulated UI preview");
    features.push("Apply or Cancel decision with an undo checkpoint");
  }

  if (/\b(sidebar)\b/.test(text)) {
    features.push("A compact, responsive sidebar with clear selected states");
  }
  if (/\b(settings)\b/.test(text)) {
    features.push("A settings surface with locally saved preferences");
  }
  if (/\b(swipe|slide|command bar|top bar)\b/.test(text)) {
    features.push("A smooth top command panel with touch-friendly controls");
  }
  if (/\b(save|history|version|undo)\b/.test(text)) {
    features.push("Local saving, version history, and a safe restore action");
  }
  if (/\b(sound|music|audio)\b/.test(text)) {
    features.push("Optional sound controls that never block the main experience");
  }

  return [...new Set(features)].slice(0, 7);
}

function inferNextVersion(type) {
  const suggestions = {
    game: "Add playtesting feedback, difficulty tuning, sound, and one deeper gameplay system.",
    website: "Add content editing, richer page states, and a lightweight publishing review flow.",
    app: "Add optional accounts and secure cloud sync only after a backend and privacy review exist.",
    "self-edit": "Connect approved plans to a secure server-side patch and preview system with human review.",
  };

  return suggestions[type];
}

function buildSelfEditPlan(idea) {
  const text = idea.toLowerCase();
  let previewKind = "layout";
  const affected = new Set(["index.html", "styles.css", "script.js"]);
  const changes = [];

  if (/\b(sidebar)\b/.test(text)) {
    previewKind = "sidebar";
    changes.push("Add or reorganize the project sidebar and its responsive open/close states.");
    affected.add("Project sidebar");
    affected.add("Mobile navigation");
  }

  if (/\b(swipe|slide|command bar|top bar)\b/.test(text)) {
    previewKind = "command";
    changes.push("Create a top control surface with smooth opening and touch-friendly commands.");
    affected.add("Top command bar");
    affected.add("Workspace positioning");
  }

  if (/\b(settings)\b/.test(text)) {
    previewKind = "settings";
    changes.push("Add a settings surface and save preferences locally.");
    affected.add("Settings dialog");
    affected.add("Local settings");
  }

  if (/\b(prompt box|chat bar|input|textbox)\b/.test(text)) {
    previewKind = "prompt";
    changes.push("Update the main prompt composer size, layout, and responsive behavior.");
    affected.add("Prompt composer");
  }

  if (/\b(homepage|layout|redesign|change the page)\b/.test(text)) {
    previewKind = "layout";
    changes.push("Rework the workspace layout while preserving all existing project actions.");
    affected.add("Workspace layout");
  }

  if (!changes.length) {
    changes.push("Translate the request into a focused interface update without removing current tools.");
    affected.add("Workspace interface");
  }

  changes.push("Preserve current local projects, settings, and version history.");
  changes.push("Verify desktop, iPad, and phone layouts before publishing.");

  let riskLevel = "low";
  if (/\b(layout|sidebar|navigation|settings|restructure|move)\b/.test(text)) {
    riskLevel = "medium";
  }
  if (/\b(delete|remove all|overwrite|api key|backend|authentication|payment|run code)\b/.test(text)) {
    riskLevel = "high";
  }

  return {
    requestedChange: idea,
    uiChanges: changes,
    affectedSections: [...affected],
    riskLevel,
    checkpoint: `Version saved before approving: ${new Date().toLocaleString()}`,
    previewKind,
    previewCaption: previewCaptionForKind(previewKind),
  };
}

function previewCaptionForKind(kind) {
  const captions = {
    sidebar: "The highlighted area shows the proposed sidebar change.",
    command: "The highlighted top edge shows the proposed command control.",
    settings: "The highlighted panel shows where the settings experience would live.",
    prompt: "The highlighted composer shows the proposed prompt-box change.",
    layout: "The highlighted workspace panel shows the proposed layout update.",
  };

  return captions[kind] || captions.layout;
}

function buildProjectDraft(idea, currentProject, isImprovement) {
  const detectedType = detectProjectType(idea);
  const type = isImprovement && currentProject && detectedType !== "self-edit"
    ? currentProject.type
    : detectedType;
  const now = new Date().toISOString();
  const base = currentProject && isImprovement
    ? {
        ...currentProject,
        versions: [...currentProject.versions],
      }
    : {
        id: makeId(),
        createdAt: now,
        versions: [],
      };

  const combinedIdea = isImprovement && currentProject
    ? `${currentProject.idea}\n\nVersion ${currentProject.versionNumber + 1} improvement request:\n${idea}`
    : idea;

  const project = {
    ...base,
    name: type === "self-edit"
      ? "Dexter's Vibe Lab"
      : isImprovement && currentProject
        ? currentProject.name
        : titleFromIdea(idea, type),
    type,
    status: type === "self-edit" ? "planned" : isImprovement ? "improved" : "ready for Codex",
    idea: combinedIdea,
    goal: idea,
    features: inferFeatures(idea, type),
    designStyle: inferDesignStyle(idea, type),
    files: ["index.html", "styles.css", "script.js"],
    safetyLimits: [...SAFETY_LIMITS],
    prompt: "",
    versionNumber: isImprovement && currentProject ? currentProject.versionNumber + 1 : 1,
    nextVersion: inferNextVersion(type),
    updatedAt: now,
    selfEditPlan: type === "self-edit" ? buildSelfEditPlan(idea) : null,
    approvalState: type === "self-edit" ? "awaiting approval" : "ready",
  };

  project.prompt = createCodexPrompt(project);
  return project;
}

function createCodexPrompt(project) {
  const featureLines = project.features.map((feature) => `- ${feature}`).join("\n");
  const fileLines = project.files.map((file) => `- ${file}`).join("\n");
  const safetyLines = project.safetyLimits.map((rule) => `- ${rule}`).join("\n");
  const selfEditBlock = project.type === "self-edit" && project.selfEditPlan
    ? `
Self-edit safety plan:
- You are improving Dexter's Vibe Lab itself.
- Requested change: ${project.selfEditPlan.requestedChange}
- Risk level: ${project.selfEditPlan.riskLevel}
- Planned UI changes:
${project.selfEditPlan.uiChanges.map((change) => `  - ${change}`).join("\n")}
- Affected sections:
${project.selfEditPlan.affectedSections.map((section) => `  - ${section}`).join("\n")}
- Before editing, inspect the existing files and preserve an undo checkpoint.
- Show the exact intended changes before applying them.
- Do not publish until the result is reviewed and approved.
`
    : "";

  return `You are Codex, acting as a senior product engineer and patient guide for a beginner.

Build ${project.name} — Version ${project.versionNumber}.

Project type:
${project.type}

Goal:
${project.goal}

Features to include:
${featureLines}

Design style:
${project.designStyle}

Files to create or update:
${fileLines}

Technical approach:
- Use plain HTML, CSS, and JavaScript.
- Keep the project static and dependency-free for this version.
- Make it work on ${deviceDescription(settings.defaultDevice)}.
- Use responsive layout, readable text, accessible labels, and touch-friendly controls.
- Keep state in localStorage only when device-local persistence is useful.
- Organize logic into small, clear functions and reuse existing project patterns.
- Test the main workflow and check that text and controls do not overlap.

Safety limits:
${safetyLines}
${selfEditBlock}
Do not build yet:
- No real AI connection or paid API.
- No account system, payment flow, advertising, crypto, or NFTs.
- No browser-stored API keys or secrets.
- No copied copyrighted characters, brands, logos, music, or worlds.
- No automatic code execution, file rewriting, deployment, or publishing.
- Do not remove working features unless the requested change requires it and an undo version exists.

Handoff:
- Complete the requested Version ${project.versionNumber}.
- Explain what changed and how to use it.
- List the checks you performed.
- Suggest this next version: ${project.nextVersion}`;
}

function deviceDescription(device) {
  const labels = {
    all: "desktop, iPad, and phone",
    desktop: "desktop browsers",
    ipad: "iPad in portrait and landscape",
    phone: "phone browsers with thumb-friendly controls",
  };

  return labels[device] || labels.all;
}

function createVersionEntry(project, notes) {
  return {
    id: makeId(),
    number: project.versionNumber,
    notes,
    createdAt: project.updatedAt || new Date().toISOString(),
    snapshot: {
      name: project.name,
      type: project.type,
      status: project.status,
      idea: project.idea,
      goal: project.goal,
      features: [...(project.features || [])],
      designStyle: project.designStyle,
      files: [...(project.files || [])],
      safetyLimits: [...(project.safetyLimits || SAFETY_LIMITS)],
      prompt: project.prompt,
      versionNumber: project.versionNumber,
      nextVersion: project.nextVersion,
      selfEditPlan: project.selfEditPlan,
      approvalState: project.approvalState,
    },
  };
}

function completeProjectSave(project, isImprovement) {
  const notes = isImprovement
    ? `Improved from Version ${Math.max(1, project.versionNumber - 1)}: ${project.goal}`
    : project.type === "self-edit"
      ? `Self-edit plan: ${project.goal}`
      : `Initial plan: ${project.goal}`;

  project.versions = [...project.versions, createVersionEntry(project, notes)];
  const index = projects.findIndex((item) => item.id === project.id);

  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.unshift(project);
  }

  currentProjectId = project.id;
  saveProjects();
}

function getStepDetails(project) {
  return [
    `${project.name}: ${project.goal}`,
    project.goal.length < 45
      ? "Filled in visual, scope, and device gaps with safe defaults."
      : "No blocking questions. The request has enough detail for a first plan.",
    `Chosen type: ${formatType(project.type)}.`,
    `${project.features.length} focused features selected for this version.`,
    `${project.safetyLimits.length} safety limits added to the build.`,
    `A structured Version ${project.versionNumber} prompt is ready.`,
    "Saved privately in this browser with an undo version.",
    project.nextVersion,
  ];
}

function formatType(type) {
  return type === "self-edit" ? "Self-edit" : toTitleCase(type);
}

function shouldImproveCurrent(idea, currentProject, type) {
  if (!currentProject) {
    return false;
  }

  if (type === "self-edit") {
    return currentProject.type === "self-edit";
  }

  return /\b(improve|update|change|add|fix|make it|version|redesign|bigger|smaller)\b/i.test(idea);
}

async function runPlanningProcess(idea) {
  const issue = findSafetyIssue(idea);
  if (issue) {
    showToast(`Please remove ${issue.label} and try again.`, true);
    return;
  }

  const runId = ++activeRun;
  const detectedType = detectProjectType(idea);
  let currentProject = getCurrentProject();

  if (detectedType === "self-edit" && (!currentProject || currentProject.type !== "self-edit")) {
    currentProject = projects.find((project) => project.type === "self-edit") || null;
  }

  const isImprovement = shouldImproveCurrent(idea, currentProject, detectedType);
  const project = buildProjectDraft(idea, currentProject, isImprovement);
  const details = getStepDetails(project);

  setPlanningState(true);
  hideResultSections();
  renderProcessSteps(-1, details);

  for (let index = 0; index < PROCESS_STEPS.length; index += 1) {
    if (runId !== activeRun) {
      return;
    }

    renderProcessSteps(index, details);
    updateProgress(Math.round((index / PROCESS_STEPS.length) * 100));
    await wait(index === 0 ? 360 : 300);
  }

  if (runId !== activeRun) {
    return;
  }

  completeProjectSave(project, isImprovement);
  renderProcessSteps(PROCESS_STEPS.length, details);
  updateProgress(100);
  setPlanningState(false);
  renderAll();
  showToast(project.type === "self-edit" ? "Safe change plan ready for review." : "Project planned and saved.");

  if (settings.focusPrompt) {
    window.setTimeout(() => {
      const target = project.type === "self-edit" ? elements.selfEditSection : elements.resultsGrid;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function setPlanningState(isPlanning) {
  elements.submitIdea.disabled = isPlanning;
  elements.submitIdea.querySelector("span:first-child").textContent = isPlanning ? "Planning…" : "Plan Project";
}

function hideResultSections() {
  elements.briefSection.hidden = true;
  elements.selfEditSection.hidden = true;
  elements.resultsGrid.hidden = true;
}

function renderProcessSteps(activeIndex = -1, details = []) {
  elements.processGrid.innerHTML = "";

  PROCESS_STEPS.forEach((step, index) => {
    const card = document.createElement("article");
    card.className = "process-card";
    const isComplete = activeIndex >= PROCESS_STEPS.length || index < activeIndex;
    const isActive = index === activeIndex;

    if (isComplete) {
      card.classList.add("is-complete");
    } else if (isActive) {
      card.classList.add("is-active");
    }

    const marker = document.createElement("span");
    marker.className = "step-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = isComplete ? "✓" : String(index + 1);

    const copy = document.createElement("div");
    copy.className = "process-copy";

    const title = document.createElement("h3");
    title.textContent = `Step ${index + 1}: ${step.title}`;

    const description = document.createElement("p");
    description.textContent = isActive
      ? "Working through this step…"
      : isComplete && details[index]
        ? details[index]
        : step.pending;

    copy.append(title, description);
    card.append(marker, copy);
    elements.processGrid.append(card);
  });
}

function updateProgress(value) {
  const safeValue = Math.max(0, Math.min(100, value));
  elements.progressNumber.textContent = `${safeValue}%`;
  elements.progressFill.style.width = `${safeValue}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(safeValue));
}

function renderAll() {
  renderSidebar();
  renderCurrentProject();
}

function renderSidebar() {
  elements.projectList.innerHTML = "";

  if (!projects.length) {
    const empty = document.createElement("p");
    empty.className = "empty-projects";
    empty.textContent = "No saved projects yet. Describe your first idea in the workspace.";
    elements.projectList.append(empty);
    return;
  }

  [...projects]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .forEach((project) => {
      const card = document.createElement("article");
      card.className = "project-card";
      card.classList.toggle("is-active", project.id === currentProjectId);
      card.dataset.projectId = project.id;

      const top = document.createElement("div");
      top.className = "project-card-top";

      const name = document.createElement("strong");
      name.className = "project-name";
      name.textContent = project.name;

      const type = document.createElement("span");
      type.className = `type-chip ${project.type}`;
      type.textContent = formatType(project.type);
      top.append(name, type);

      const meta = document.createElement("div");
      meta.className = "project-meta";

      const status = document.createElement("span");
      status.className = "project-status";
      status.textContent = project.status;

      const edited = document.createElement("time");
      edited.dateTime = project.updatedAt;
      edited.textContent = formatRelativeTime(project.updatedAt);
      meta.append(status, edited);

      const actions = document.createElement("div");
      actions.className = "project-actions";
      actions.append(
        projectActionButton("Open", "open", "↗"),
        projectActionButton("Duplicate", "duplicate", "⧉"),
        projectActionButton("Rename", "rename", "✎"),
        projectActionButton("Delete", "delete", "×"),
      );

      card.append(top, meta, actions);
      card.addEventListener("click", (event) => {
        if (!event.target.closest("button")) {
          openProject(project.id);
        }
      });
      actions.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) {
          return;
        }
        handleProjectAction(button.dataset.action, project.id);
      });
      elements.projectList.append(card);
    });
}

function projectActionButton(label, action, symbol) {
  const button = document.createElement("button");
  button.className = `project-action ${action}`;
  button.type = "button";
  button.dataset.action = action;
  button.title = label;
  button.setAttribute("aria-label", `${label} project`);

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = symbol;
  button.append(icon);
  return button;
}

function formatRelativeTime(value) {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) {
    return "just now";
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
  if (seconds < 604800) {
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function renderCurrentProject() {
  const project = getCurrentProject();

  if (!project) {
    elements.headerProjectName.textContent = "No project open";
    elements.workspaceTitle.textContent = "What should we build?";
    elements.workspaceSummary.textContent =
      "Describe an idea naturally. Vibe Lab will plan it, save it, and prepare a clean prompt for Codex.";
    elements.modeBadge.textContent = "Build mode";
    elements.modeBadge.classList.remove("self-edit");
    elements.contextLabel.textContent = "Start a new project";
    elements.improveProjectButton.hidden = true;
    elements.ideaInput.value = "";
    updateCharacterCount();
    hideResultSections();
    renderProcessSteps();
    updateProgress(0);
    return;
  }

  elements.headerProjectName.textContent = project.name;
  elements.workspaceTitle.textContent = project.name;
  elements.workspaceSummary.textContent = project.goal;
  elements.contextLabel.textContent = `${formatType(project.type)} · ${project.status} · Version ${project.versionNumber}`;
  elements.modeBadge.textContent = project.type === "self-edit" ? "Self-edit mode" : "Build mode";
  elements.modeBadge.classList.toggle("self-edit", project.type === "self-edit");
  elements.improveProjectButton.hidden = false;
  elements.ideaInput.value = "";
  elements.ideaInput.placeholder = project.type === "self-edit"
    ? "Describe another safe change to Dexter's Vibe Lab…"
    : `Describe how to improve ${project.name}…`;
  updateCharacterCount();

  const details = getStepDetails(project);
  renderProcessSteps(PROCESS_STEPS.length, details);
  updateProgress(100);
  renderBrief(project);
  renderPrompt(project);
  renderHistory(project);

  if (project.type === "self-edit") {
    renderSelfEdit(project);
  } else {
    elements.selfEditSection.hidden = true;
  }
}

function renderBrief(project) {
  elements.briefSection.hidden = false;
  elements.briefName.textContent = project.name;
  elements.briefStatus.textContent = project.status;
  elements.briefGoal.textContent = project.goal;
  elements.briefDesign.textContent = project.designStyle;
  elements.briefFeatures.innerHTML = "";
  elements.briefFiles.innerHTML = "";

  project.features.forEach((feature) => {
    const item = document.createElement("li");
    item.textContent = feature;
    elements.briefFeatures.append(item);
  });

  project.files.forEach((file) => {
    const chip = document.createElement("span");
    chip.className = "file-chip";
    chip.textContent = file;
    elements.briefFiles.append(chip);
  });
}

function renderSelfEdit(project) {
  const plan = project.selfEditPlan;

  if (!plan) {
    elements.selfEditSection.hidden = true;
    return;
  }

  elements.selfEditSection.hidden = false;
  elements.requestedChange.textContent = plan.requestedChange;
  elements.plannedChanges.innerHTML = "";
  elements.affectedSections.innerHTML = "";
  elements.riskBadge.textContent = `${toTitleCase(plan.riskLevel)} risk`;
  elements.riskBadge.className = `risk-badge ${plan.riskLevel}`;
  elements.checkpointText.textContent = plan.checkpoint;
  elements.applyChange.disabled = project.approvalState === "approved";
  elements.applyChange.textContent = project.approvalState === "approved" ? "Change Approved" : "Apply Change";

  plan.uiChanges.forEach((change) => {
    const item = document.createElement("li");
    item.textContent = change;
    elements.plannedChanges.append(item);
  });

  plan.affectedSections.forEach((section) => {
    const chip = document.createElement("span");
    chip.className = "affected-chip";
    chip.textContent = section;
    elements.affectedSections.append(chip);
  });

  elements.changePreview.className = `change-preview is-${plan.previewKind}`;
  elements.previewCaption.textContent = plan.previewCaption;
}

function renderPrompt(project) {
  elements.resultsGrid.hidden = false;
  elements.promptVersion.textContent = `Version ${project.versionNumber}`;
  elements.generatedPrompt.value = project.prompt;
}

function renderHistory(project) {
  const versions = [...project.versions].sort((a, b) => b.number - a.number);
  elements.historyList.innerHTML = "";
  elements.historyCount.textContent = `${versions.length} ${versions.length === 1 ? "version" : "versions"}`;

  versions.forEach((version, index) => {
    const item = document.createElement("article");
    item.className = "history-item";

    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `Version ${version.number}`;
    const notes = document.createElement("p");
    notes.textContent = version.notes || "Saved project version";
    const time = document.createElement("time");
    time.dateTime = version.createdAt;
    time.textContent = new Date(version.createdAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    copy.append(title, notes, time);

    const restore = document.createElement("button");
    restore.className = "restore-button";
    restore.type = "button";
    restore.textContent = index === 0 ? "Current" : "Restore";
    restore.disabled = index === 0;
    restore.addEventListener("click", () => restoreVersion(project.id, version.id));

    item.append(copy, restore);
    elements.historyList.append(item);
  });

  elements.nextVersion.innerHTML = "";
  const label = document.createElement("strong");
  label.textContent = `Suggested Version ${project.versionNumber + 1}`;
  const text = document.createElement("span");
  text.textContent = project.nextVersion;
  elements.nextVersion.append(label, text);
}

function openProject(projectId) {
  if (!projects.some((project) => project.id === projectId)) {
    return;
  }

  currentProjectId = projectId;
  saveProjects();
  renderAll();
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startNewProject() {
  activeRun += 1;
  currentProjectId = null;
  saveProjects();
  elements.ideaInput.placeholder = "Describe what you want to build or change…";
  renderCurrentProject();
  closeCommandBar();
  closeSidebar();
  elements.ideaInput.focus();
}

function handleProjectAction(action, projectId) {
  if (action === "open") {
    openProject(projectId);
  } else if (action === "duplicate") {
    duplicateProject(projectId);
  } else if (action === "rename") {
    renameProject(projectId);
  } else if (action === "delete") {
    deleteProject(projectId);
  }
}

function duplicateProject(projectId) {
  const source = projects.find((project) => project.id === projectId);
  if (!source) {
    return;
  }

  const now = new Date().toISOString();
  const copy = {
    ...source,
    id: makeId(),
    name: `${source.name} Copy`,
    status: "idea",
    versionNumber: 1,
    createdAt: now,
    updatedAt: now,
    versions: [],
    approvalState: "draft",
  };
  copy.prompt = createCodexPrompt(copy);
  copy.versions = [createVersionEntry(copy, `Duplicated from ${source.name}`)];
  projects.unshift(copy);
  currentProjectId = copy.id;
  saveProjects();
  renderAll();
  showToast("Project duplicated.");
}

function renameProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) {
    return;
  }

  const newName = window.prompt("Rename this project:", project.name);
  if (newName === null) {
    return;
  }

  const cleanName = cleanText(newName);
  if (!cleanName || cleanName === project.name) {
    return;
  }

  project.name = cleanName.slice(0, 80);
  project.updatedAt = new Date().toISOString();
  project.versionNumber += 1;
  project.prompt = createCodexPrompt(project);
  project.versions.push(createVersionEntry(project, `Renamed project to ${project.name}`));
  saveProjects();
  renderAll();
  showToast("Project renamed and an undo version was saved.");
}

function deleteProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) {
    return;
  }

  const confirmed = window.confirm(`Are you sure? Delete "${project.name}" from this device?`);
  if (!confirmed) {
    return;
  }

  projects = projects.filter((item) => item.id !== projectId);
  if (currentProjectId === projectId) {
    currentProjectId = projects[0]?.id || null;
  }
  saveProjects();
  renderAll();
  showToast("Project deleted from this device.");
}

function restartCurrentProject() {
  const project = getCurrentProject();
  if (!project) {
    showToast("Open a project first.");
    return;
  }

  const confirmed = window.confirm(`Restart the planning view for "${project.name}"? The saved project will stay available.`);
  if (!confirmed) {
    return;
  }

  activeRun += 1;
  elements.ideaInput.value = "";
  updateCharacterCount();
  renderProcessSteps();
  updateProgress(0);
  hideResultSections();
  closeCommandBar();
  elements.ideaInput.focus();
  showToast("Planning view restarted. The saved version is still safe.");
}

function restoreVersion(projectId, versionId) {
  const project = projects.find((item) => item.id === projectId);
  const version = project?.versions.find((item) => item.id === versionId);
  if (!project || !version) {
    return;
  }

  const confirmed = window.confirm(
    `Restore Version ${version.number}? The current version will remain in history as an undo checkpoint.`,
  );
  if (!confirmed) {
    return;
  }

  const snapshot = version.snapshot;
  const restoredNumber = project.versionNumber + 1;
  Object.assign(project, {
    ...snapshot,
    versionNumber: restoredNumber,
    updatedAt: new Date().toISOString(),
    status: "improved",
  });
  project.prompt = createCodexPrompt(project);
  project.versions.push(
    createVersionEntry(project, `Restored from Version ${version.number}; previous state kept for undo`),
  );
  saveProjects();
  renderAll();
  showToast(`Version ${version.number} restored as Version ${restoredNumber}.`);
}

function undoLastChange() {
  const project = getCurrentProject();
  if (!project || project.versions.length < 2) {
    showToast("There is no earlier version to restore.");
    return;
  }

  const sorted = [...project.versions].sort((a, b) => b.number - a.number);
  const previous = sorted[1];
  closeCommandBar();
  restoreVersion(project.id, previous.id);
}

function exportPrompt() {
  const project = getCurrentProject();
  if (!project?.prompt) {
    showToast("Create or open a project with a prompt first.");
    return;
  }

  const blob = new Blob([project.prompt], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(project.name)}-v${project.versionNumber}-codex-prompt.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  closeCommandBar();
  showToast("Prompt exported.");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "vibe-lab-project";
}

async function copyCurrentPrompt() {
  const prompt = elements.generatedPrompt.value;
  if (!prompt) {
    return;
  }

  try {
    await navigator.clipboard.writeText(prompt);
    elements.copyPrompt.textContent = "Copied";
    showToast("Codex prompt copied.");
  } catch {
    elements.generatedPrompt.focus();
    elements.generatedPrompt.select();
    elements.copyPrompt.textContent = "Prompt selected";
    showToast("Press Copy to copy the selected prompt.");
  }

  window.setTimeout(() => {
    elements.copyPrompt.textContent = "Copy Codex Prompt";
  }, 1500);
}

function approveSelfEdit() {
  const project = getCurrentProject();
  if (!project || project.type !== "self-edit" || project.approvalState === "approved") {
    return;
  }

  project.approvalState = "approved";
  project.status = "ready for Codex";
  project.versionNumber += 1;
  project.updatedAt = new Date().toISOString();
  project.prompt = createCodexPrompt(project);
  project.versions.push(
    createVersionEntry(project, "Change Plan approved; live files were not changed"),
  );
  saveProjects();
  renderAll();
  showToast("Plan approved. Copy the Codex prompt when you are ready.");
}

function cancelSelfEdit() {
  const project = getCurrentProject();
  if (!project || project.type !== "self-edit") {
    return;
  }

  project.approvalState = "canceled";
  project.status = "idea";
  project.updatedAt = new Date().toISOString();
  saveProjects();
  renderAll();
  elements.selfEditSection.hidden = true;
  showToast("Change canceled. Nothing was changed.");
}

function openSettings() {
  closeCommandBar();
  applySettings();

  if (typeof elements.settingsDialog.showModal === "function") {
    elements.settingsDialog.showModal();
  } else {
    elements.settingsDialog.setAttribute("open", "");
  }
}

function toggleCommandBar() {
  const open = !elements.body.classList.contains("command-open");
  elements.body.classList.toggle("command-open", open);
  elements.commandToggle.setAttribute("aria-expanded", String(open));
  elements.commandBar.setAttribute("aria-hidden", String(!open));

  if (open) {
    closeSidebar();
  }
}

function closeCommandBar() {
  elements.body.classList.remove("command-open");
  elements.commandToggle.setAttribute("aria-expanded", "false");
  elements.commandBar.setAttribute("aria-hidden", "true");
}

function toggleSidebar() {
  const open = !elements.body.classList.contains("sidebar-open");
  elements.body.classList.toggle("sidebar-open", open);
  elements.sidebarToggle.setAttribute("aria-expanded", String(open));

  if (open) {
    closeCommandBar();
  }
}

function closeSidebar() {
  elements.body.classList.remove("sidebar-open");
  elements.sidebarToggle.setAttribute("aria-expanded", "false");
}

function handleCommand(command) {
  if (command === "new") {
    startNewProject();
  } else if (command === "restart") {
    restartCurrentProject();
  } else if (command === "delete") {
    const project = getCurrentProject();
    if (project) {
      closeCommandBar();
      deleteProject(project.id);
    } else {
      showToast("Open a project first.");
    }
  } else if (command === "undo") {
    undoLastChange();
  } else if (command === "export") {
    exportPrompt();
  } else if (command === "settings") {
    openSettings();
  }
}

function updateCharacterCount() {
  const length = elements.ideaInput.value.length;
  elements.characterCount.textContent = `${length} / 2400`;
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("is-error", isError);
  elements.toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 3000);
}

elements.ideaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const idea = cleanText(elements.ideaInput.value);

  if (!idea) {
    elements.ideaInput.focus();
    return;
  }

  runPlanningProcess(idea);
});

elements.ideaInput.addEventListener("input", updateCharacterCount);
elements.ideaInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    elements.ideaForm.requestSubmit();
  }
});

elements.improveProjectButton.addEventListener("click", () => {
  const project = getCurrentProject();
  if (!project) {
    return;
  }

  elements.ideaInput.value = project.type === "self-edit"
    ? "Improve Dexter's Vibe Lab by "
    : `Improve ${project.name} by `;
  updateCharacterCount();
  elements.ideaInput.focus();
  elements.ideaInput.setSelectionRange(elements.ideaInput.value.length, elements.ideaInput.value.length);
});

elements.commandToggle.addEventListener("click", toggleCommandBar);
elements.sidebarToggle.addEventListener("click", toggleSidebar);
elements.sidebarBackdrop.addEventListener("click", closeSidebar);
elements.newProjectButton.addEventListener("click", startNewProject);
elements.copyPrompt.addEventListener("click", copyCurrentPrompt);
elements.applyChange.addEventListener("click", approveSelfEdit);
elements.cancelChange.addEventListener("click", cancelSelfEdit);

elements.commandActions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-command]");
  if (button) {
    handleCommand(button.dataset.command);
  }
});

elements.settingsForm.addEventListener("submit", (event) => {
  const submitter = event.submitter;
  if (!submitter || submitter.value !== "save") {
    return;
  }

  event.preventDefault();
  settings = {
    defaultDevice: elements.defaultDevice.value,
    compactMode: elements.compactMode.checked,
    focusPrompt: elements.focusPrompt.checked,
  };
  saveSettings();
  elements.settingsDialog.close();
  showToast("Settings saved.");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCommandBar();
    closeSidebar();
  }
});

window.addEventListener("storage", (event) => {
  if ([PROJECTS_KEY, CURRENT_PROJECT_KEY].includes(event.key)) {
    projects = loadProjects();
    currentProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
    renderAll();
  }
});

projects = loadProjects();
const savedCurrentId = localStorage.getItem(CURRENT_PROJECT_KEY);
currentProjectId = projects.some((project) => project.id === savedCurrentId)
  ? savedCurrentId
  : projects[0]?.id || null;
applySettings();
renderProcessSteps();
renderAll();
