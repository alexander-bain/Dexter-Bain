const STORAGE_KEY = "memories-social-state-v2";
const OLD_STORAGE_KEY = "memories-social-state-v1";
const DB_NAME = "memories-media-store";
const DB_STORE = "attachments";
const CATEGORY_ALL = "All";
const CATEGORIES = [CATEGORY_ALL, "Family Day", "Trip", "Sports Game", "Friends", "School", "Holiday", "Other"];

const defaultState = {
  user: null,
  people: [],
  posts: [],
  sharedPosts: [],
  liked: [],
  following: [],
  friendRequests: [],
  friends: [],
  feedMode: "all",
  category: CATEGORY_ALL,
  query: "",
  view: "feed"
};

let state = loadState();
let attachmentCache = new Map();

const els = {
  accountGate: document.querySelector("#accountGate"),
  accountForm: document.querySelector("#accountForm"),
  composer: document.querySelector("#composer"),
  openComposer: document.querySelector("#openComposer"),
  closeComposer: document.querySelector("#closeComposer"),
  memoryForm: document.querySelector("#memoryForm"),
  photoInput: document.querySelector("#memoryPhotos"),
  fileInput: document.querySelector("#memoryFiles"),
  fileSummary: document.querySelector("#fileSummary"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilters: document.querySelector("#categoryFilters"),
  feedMode: document.querySelector("#feedMode"),
  feedPosts: document.querySelector("#feedPosts"),
  profilePanel: document.querySelector("#profilePanel"),
  profilePosts: document.querySelector("#profilePosts"),
  friendsGrid: document.querySelector("#friendsGrid"),
  peopleGrid: document.querySelector("#peopleGrid"),
  sessionCard: document.querySelector("#sessionCard"),
  postCount: document.querySelector("#postCount"),
  mediaCount: document.querySelector("#mediaCount"),
  friendCount: document.querySelector("#friendCount"),
  dialog: document.querySelector("#memoryDialog"),
  document: document.querySelector("#memoryDocument")
};

function loadState() {
  localStorage.removeItem(OLD_STORAGE_KEY);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return sanitizeState({ ...defaultState, ...saved });
  } catch {
    return structuredClone(defaultState);
  }
}

function sanitizeState(nextState) {
  const peopleIds = new Set((nextState.people || []).map((person) => person.id));
  const ownPosts = (nextState.posts || []).filter((post) => post.authorId === "me");
  const sharedPosts = (nextState.sharedPosts || []).filter((post) => peopleIds.has(post.authorId));

  return {
    ...defaultState,
    ...nextState,
    people: nextState.people || [],
    posts: ownPosts,
    sharedPosts,
    liked: nextState.liked || [],
    following: (nextState.following || []).filter((id) => peopleIds.has(id)),
    friendRequests: (nextState.friendRequests || []).filter((id) => peopleIds.has(id)),
    friends: (nextState.friends || []).filter((id) => peopleIds.has(id)),
    category: CATEGORIES.includes(nextState.category) ? nextState.category : CATEGORY_ALL,
    feedMode: ["all", "mine", "following", "friends"].includes(nextState.feedMode) ? nextState.feedMode : "all",
    view: ["feed", "profile", "friends", "people"].includes(nextState.view) ? nextState.view : "feed"
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DB_STORE, { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function saveAttachment(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(record);
    tx.oncomplete = () => {
      attachmentCache.set(record.id, record);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function getAttachment(id) {
  if (attachmentCache.has(id)) return attachmentCache.get(id);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const request = tx.objectStore(DB_STORE).get(id);
    request.onsuccess = () => {
      const record = request.result || null;
      if (record) attachmentCache.set(id, record);
      resolve(record);
    };
    request.onerror = () => reject(request.error);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "M";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "Undated";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}

function kindFromType(type = "") {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "file";
}

function getPeople() {
  return state.user ? [state.user, ...state.people] : [...state.people];
}

function getPerson(id) {
  if (id === state.user?.id || id === "me") return state.user;
  return state.people.find((person) => person.id === id) || null;
}

function getAllPosts() {
  return [...state.posts, ...state.sharedPosts].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
}

function getPostAuthor(post) {
  return getPerson(post.authorId) || {
    id: post.authorId,
    name: "Unknown user",
    handle: "unknown",
    bio: "",
    color: "#6a716c"
  };
}

function filterPosts(posts, mode = state.feedMode) {
  const query = state.query.trim().toLowerCase();
  return posts.filter((post) => {
    const author = getPostAuthor(post);
    const inCategory = state.category === CATEGORY_ALL || post.category === state.category;
    const inMode = mode === "all"
      || (mode === "mine" && post.authorId === "me")
      || (mode === "following" && state.following.includes(post.authorId))
      || (mode === "friends" && state.friends.includes(post.authorId));
    const haystack = `${post.title} ${post.caption} ${post.location} ${post.category} ${post.importance || ""} ${post.peopleNote || ""} ${author.name} ${author.handle}`.toLowerCase();
    return inCategory && inMode && (!query || haystack.includes(query));
  });
}

function avatarHtml(person, sizeClass = "") {
  if (person?.avatar) {
    return `<span class="avatar ${sizeClass}" style="background:${person.color || "#1f7a74"}"><img src="${person.avatar}" alt=""></span>`;
  }
  return `<span class="avatar ${sizeClass}" style="background:${person?.color || "#1f7a74"}">${escapeHtml(initials(person?.name))}</span>`;
}

function withCachedAttachmentData(attachment) {
  const cached = attachmentCache.get(attachment.id);
  return cached ? { ...attachment, ...cached } : attachment;
}

function render() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });

  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  document.querySelector(`#${state.view}View`)?.classList.add("active-view");

  els.accountGate.hidden = Boolean(state.user);
  els.searchInput.value = state.query;
  renderCategories();
  renderSessionCard();
  renderFeed();
  renderProfile();
  renderPeople();
  renderStats();
  saveState();
}

function renderCategories() {
  const counts = getAllPosts().reduce((acc, post) => {
    acc[post.category] = (acc[post.category] || 0) + 1;
    acc[CATEGORY_ALL] = (acc[CATEGORY_ALL] || 0) + 1;
    return acc;
  }, {});

  els.categoryFilters.innerHTML = CATEGORIES.map((category) => `
    <button class="category-button ${state.category === category ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">
      <span>${escapeHtml(category)}</span>
      <strong>${counts[category] || 0}</strong>
    </button>
  `).join("");
}

function renderSessionCard() {
  if (!state.user) {
    els.sessionCard.innerHTML = `
      <h2>Account</h2>
      <p class="empty-state">Create your account to start your private local memory archive.</p>
    `;
    return;
  }

  els.sessionCard.innerHTML = `
    <h2>Account</h2>
    <div class="profile-card compact">
      ${avatarHtml(state.user)}
      <div>
        <strong>${escapeHtml(state.user.name)}</strong>
        <div class="person-meta"><small>@${escapeHtml(state.user.handle)}</small></div>
      </div>
    </div>
    <p>${escapeHtml(state.user.bio || "No bio yet.")}</p>
    <button class="small-button" type="button" data-view="profile">Open account</button>
  `;
}

function renderStats() {
  els.postCount.textContent = state.posts.length;
  els.mediaCount.textContent = state.posts.reduce((sum, post) => sum + post.attachments.length, 0);
  els.friendCount.textContent = state.friends.length;
}

function renderFeed() {
  [...els.feedMode.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.feedMode);
  });

  const posts = filterPosts(getAllPosts());
  els.feedPosts.innerHTML = posts.length
    ? posts.map(postCardHtml).join("")
    : emptyStateHtml(
      "No saved memories yet",
      state.user
        ? "Save your first important memory. Real shared memories from connected users can appear here later."
        : "Create an account first. The archive is empty because there are no saved memories yet."
    );
}

function renderProfile() {
  if (!state.user) {
    els.profilePanel.innerHTML = emptyStateHtml("No account yet", "Create an account to see your profile and saved memories.");
    els.profilePosts.innerHTML = "";
    return;
  }

  els.profilePanel.innerHTML = `
    <section class="profile-panel">
      <div class="profile-card">
        ${avatarHtml(state.user)}
        <div class="profile-copy">
          <p class="eyebrow">Account</p>
          <h2>${escapeHtml(state.user.name)}</h2>
          <p>@${escapeHtml(state.user.handle)} | ${state.posts.length} saved memories | ${state.friends.length} friends</p>
          <p>${escapeHtml(state.user.bio || "No bio yet.")}</p>
          <div class="profile-actions">
            <button class="primary-button" type="button" id="profileNewMemory">Save memory</button>
            <button class="ghost-button" type="button" id="clearLocalData">Clear local data</button>
          </div>
        </div>
      </div>
    </section>
  `;

  const posts = state.posts.filter((post) => {
    if (state.category !== CATEGORY_ALL && post.category !== state.category) return false;
    if (!state.query) return true;
    return `${post.title} ${post.caption} ${post.location} ${post.importance || ""} ${post.peopleNote || ""}`.toLowerCase().includes(state.query.toLowerCase());
  });

  els.profilePosts.innerHTML = posts.length
    ? `<div class="memory-list-heading"><strong>Saved memories</strong><span>Small rows. Open one when you want the full document.</span></div>${posts.map(memoryRowHtml).join("")}`
    : emptyStateHtml("No memories on this account", "Save a memory and it will appear here as a compact row you can open.");
}

function renderPeople() {
  const people = state.people;
  els.peopleGrid.innerHTML = people.length
    ? people.map(personCardHtml).join("")
    : emptyStateHtml("No real users connected", "This list is intentionally empty. When the app has a real backend or imported real profiles, those people can appear here.");

  const friends = people.filter((person) => state.friends.includes(person.id));
  els.friendsGrid.innerHTML = friends.length
    ? friends.map(personCardHtml).join("")
    : emptyStateHtml("No friends yet", "Friend requests and accepted friends will show here once there are real users to connect with.");
}

function postCardHtml(post) {
  const author = getPostAuthor(post);
  const firstVisual = post.attachments
    .map(withCachedAttachmentData)
    .find((attachment) => ["image", "video"].includes(attachment.kind) && attachment.data);
  const liked = state.liked.includes(post.id);
  const likeCount = (post.likeCount || 0) + (liked ? 1 : 0);
  const canConnect = post.authorId !== "me" && author.id !== "unknown";

  return `
    <article class="post-card" data-post-id="${escapeHtml(post.id)}">
      <button class="post-media ${firstVisual ? "" : "placeholder"}" type="button" data-open-post="${escapeHtml(post.id)}">
        ${mediaPreviewHtml(firstVisual, post)}
      </button>
      <div class="post-body">
        <div class="post-author">
          ${avatarHtml(author)}
          <div>
            <strong>${escapeHtml(author.name)}</strong>
            <div class="post-meta">@${escapeHtml(author.handle)} | ${formatDate(post.date)} | ${escapeHtml(post.location || "No location")}</div>
          </div>
        </div>
        <div class="post-title-row">
          <h3>${escapeHtml(post.title)}</h3>
          <span class="pill">${escapeHtml(post.category)}</span>
        </div>
        <p>${escapeHtml(post.caption)}</p>
        <div class="memory-facts">
          <span>${escapeHtml(post.importance || "Important")}</span>
          ${post.peopleNote ? `<span>${escapeHtml(post.peopleNote)}</span>` : ""}
        </div>
        <span class="media-pill">${post.attachments.length} item${post.attachments.length === 1 ? "" : "s"} in memory document</span>
        <div class="post-actions">
          <div>
            <button class="small-button ${liked ? "liked" : ""}" type="button" data-like="${escapeHtml(post.id)}">${liked ? "Liked" : "Like"} | ${likeCount}</button>
            <button class="small-button" type="button" data-open-post="${escapeHtml(post.id)}">Open</button>
          </div>
          ${canConnect ? `<button class="small-button" type="button" data-follow="${escapeHtml(author.id)}">${state.following.includes(author.id) ? "Following" : "Follow"}</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

function memoryRowHtml(post) {
  const hasVisual = post.attachments.some((attachment) => ["image", "video"].includes(attachment.kind));
  return `
    <article class="memory-row" data-post-id="${escapeHtml(post.id)}">
      <button class="memory-open" type="button" data-open-post="${escapeHtml(post.id)}">
        <span>Open</span>
        <strong>${escapeHtml(post.title)}</strong>
      </button>
      <div class="memory-row-meta">
        <span>${formatDate(post.date)}</span>
        <span>${escapeHtml(post.category)}</span>
        <span>${escapeHtml(post.importance || "Important")}</span>
        <span>${post.attachments.length} file${post.attachments.length === 1 ? "" : "s"}</span>
        ${hasVisual ? "<span>visual media</span>" : ""}
      </div>
      ${post.peopleNote ? `<p>${escapeHtml(post.peopleNote)}</p>` : ""}
    </article>
  `;
}

function mediaPreviewHtml(attachment, post) {
  if (!attachment) return `<span>${escapeHtml(post.category)} memory document</span>`;
  if (attachment.kind === "video") return `<video src="${attachment.data}" muted playsinline></video>`;
  return `<img src="${attachment.data}" alt="${escapeHtml(post.title)}">`;
}

function personCardHtml(person) {
  const following = state.following.includes(person.id);
  const requested = state.friendRequests.includes(person.id);
  const friend = state.friends.includes(person.id);
  const postCount = state.sharedPosts.filter((post) => post.authorId === person.id).length;
  const friendLabel = friend ? "Friends" : requested ? "Requested" : "Friend";

  return `
    <article class="person-card">
      ${avatarHtml(person)}
      <div class="person-meta">
        <h3>${escapeHtml(person.name)}</h3>
        <small>@${escapeHtml(person.handle)} | ${postCount} memories</small>
        <p>${escapeHtml(person.bio || "No bio yet.")}</p>
        <div class="person-actions">
          <button class="small-button" type="button" data-follow="${escapeHtml(person.id)}">${following ? "Following" : "Follow"}</button>
          <button class="small-button" type="button" data-friend="${escapeHtml(person.id)}">${friendLabel}</button>
        </div>
      </div>
    </article>
  `;
}

function emptyStateHtml(title, body) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

async function renderMemoryDocument(postId) {
  const post = getAllPosts().find((item) => item.id === postId);
  if (!post) return;
  const author = getPostAuthor(post);
  const attachments = await Promise.all(post.attachments.map(async (attachment) => {
    if (attachment.data) return attachment;
    const record = await getAttachment(attachment.id);
    return record ? { ...attachment, ...record } : attachment;
  }));
  const cover = attachments.find((attachment) => ["image", "video"].includes(attachment.kind) && attachment.data);

  els.document.innerHTML = `
    <div class="document-cover">
      ${cover ? mediaPreviewHtml(cover, post) : `<div class="post-media placeholder"><span>${escapeHtml(post.category)} memory document</span></div>`}
    </div>
    <div class="document-body">
      <div class="document-title">
        <div>
          <p class="eyebrow">Memory document</p>
          <h2>${escapeHtml(post.title)}</h2>
          <p class="post-meta">${escapeHtml(author.name)} | ${formatDate(post.date)} | ${escapeHtml(post.location || "No location")}</p>
        </div>
        <div class="dialog-actions">
          <button class="small-button ${state.liked.includes(post.id) ? "liked" : ""}" type="button" data-like="${escapeHtml(post.id)}">${state.liked.includes(post.id) ? "Liked" : "Like"}</button>
          <button class="icon-button" type="button" data-close-dialog aria-label="Close memory document">x</button>
        </div>
      </div>
      <p class="document-story">${escapeHtml(post.caption)}</p>
      <div class="document-facts">
        <span class="pill">${escapeHtml(post.category)}</span>
        <span class="pill">${escapeHtml(post.importance || "Important")}</span>
        ${post.peopleNote ? `<span class="pill">${escapeHtml(post.peopleNote)}</span>` : ""}
      </div>
      <div class="attachment-grid">
        ${attachments.length ? attachments.map(attachmentHtml).join("") : emptyStateHtml("No files attached", "This memory has a story but no uploaded media yet.")}
      </div>
    </div>
  `;
  els.dialog.showModal();
}

function attachmentHtml(attachment) {
  const name = escapeHtml(attachment.name || "Memory file");
  const meta = `${escapeHtml(attachment.type || "file")} | ${formatSize(attachment.size || 0)}`;
  if (attachment.kind === "image" && attachment.data) {
    return `<article class="attachment-card"><img src="${attachment.data}" alt="${name}"><div class="attachment-meta">${name}<br>${meta}</div></article>`;
  }
  if (attachment.kind === "video" && attachment.data) {
    return `<article class="attachment-card"><video src="${attachment.data}" controls></video><div class="attachment-meta">${name}<br>${meta}</div></article>`;
  }
  if (attachment.kind === "audio" && attachment.data) {
    return `<article class="attachment-card"><audio src="${attachment.data}" controls></audio><div class="attachment-meta">${name}<br>${meta}</div></article>`;
  }
  if (attachment.data) {
    return `
      <article class="attachment-card">
        <div class="attachment-file">
          <strong>${name}</strong>
          <span>${meta}</span>
          <a class="small-button" href="${attachment.data}" download="${name}">Download</a>
        </div>
      </article>
    `;
  }
  return `
    <article class="attachment-card">
      <div class="attachment-file">
        <strong>${name}</strong>
        <span>${meta}</span>
        <small>File data is unavailable on this device.</small>
      </div>
    </article>
  `;
}

async function createAccount(form) {
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const handle = String(formData.get("handle") || "").trim().replace(/^@/, "").replace(/\s+/g, "").toLowerCase();
  const bio = String(formData.get("bio") || "").trim();
  const avatarFile = formData.get("avatar");
  const avatar = avatarFile?.size ? await fileToDataUrl(avatarFile) : "";

  state.user = {
    id: "me",
    name,
    handle,
    bio,
    avatar,
    color: "#1f7a74"
  };
  state.view = "profile";
  form.reset();
  render();
}

async function createPost(form) {
  if (!state.user) {
    state.view = "feed";
    render();
    return;
  }

  const formData = new FormData(form);
  const files = getSelectedFiles();
  const attachmentRecords = [];

  for (const file of files) {
    const id = makeId("attachment");
    const kind = kindFromType(file.type);
    const data = await fileToDataUrl(file);
    const record = {
      id,
      kind,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      data
    };
    await saveAttachment(record);
    attachmentRecords.push({
      id,
      kind,
      name: record.name,
      type: record.type,
      size: record.size
    });
  }

  const post = {
    id: makeId("post"),
    authorId: "me",
    title: String(formData.get("title") || "").trim(),
    category: String(formData.get("category") || "Other"),
    importance: String(formData.get("importance") || "Important"),
    date: String(formData.get("date") || new Date().toISOString().slice(0, 10)),
    location: String(formData.get("location") || "").trim(),
    peopleNote: String(formData.get("peopleNote") || "").trim(),
    caption: String(formData.get("caption") || "").trim(),
    createdAt: new Date().toISOString(),
    likeCount: 0,
    attachments: attachmentRecords
  };

  state.posts.unshift(post);
  state.view = "profile";
  els.composer.hidden = true;
  form.reset();
  updateFileSummary();
  render();
  await renderMemoryDocument(post.id);
}

function toggleLike(postId) {
  state.liked = state.liked.includes(postId)
    ? state.liked.filter((id) => id !== postId)
    : [...state.liked, postId];
  render();
}

function toggleFollow(personId) {
  state.following = state.following.includes(personId)
    ? state.following.filter((id) => id !== personId)
    : [...state.following, personId];
  render();
}

function toggleFriend(personId) {
  if (state.friends.includes(personId)) {
    state.friends = state.friends.filter((id) => id !== personId);
  } else if (state.friendRequests.includes(personId)) {
    state.friendRequests = state.friendRequests.filter((id) => id !== personId);
    state.friends = [...state.friends, personId];
  } else {
    state.friendRequests = [...state.friendRequests, personId];
  }
  render();
}

function setView(view) {
  state.view = view;
  render();
}

function openComposer() {
  if (!state.user) {
    state.view = "feed";
    els.composer.hidden = true;
    render();
    els.accountGate.scrollIntoView({ behavior: "smooth", block: "start" });
    els.accountForm.elements.name?.focus();
    return;
  }

  els.composer.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearLocalData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(OLD_STORAGE_KEY);
  indexedDB.deleteDatabase(DB_NAME);
  state = structuredClone(defaultState);
  attachmentCache = new Map();
  render();
}

function updateFileSummary() {
  const files = getSelectedFiles();
  if (!files.length) {
    els.fileSummary.textContent = "Photos and videos go through Photos. Documents, audio, and anything else go through Files.";
    return;
  }

  const counts = files.reduce((acc, file) => {
    const kind = kindFromType(file.type);
    acc[kind] = (acc[kind] || 0) + 1;
    return acc;
  }, {});
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const parts = [
    labelCount(counts.image, "photo"),
    labelCount(counts.video, "video"),
    labelCount(counts.audio, "audio"),
    labelCount(counts.file, "file")
  ].filter(Boolean);
  els.fileSummary.textContent = `${parts.join(", ")} selected | ${formatSize(total)} total`;
}

function getSelectedFiles() {
  return [...els.photoInput.files, ...els.fileInput.files];
}

function labelCount(count, label) {
  if (!count) return "";
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) setView(viewButton.dataset.view);

  const openPost = event.target.closest("[data-open-post]");
  if (openPost) renderMemoryDocument(openPost.dataset.openPost);

  const like = event.target.closest("[data-like]");
  if (like) toggleLike(like.dataset.like);

  const follow = event.target.closest("[data-follow]");
  if (follow) toggleFollow(follow.dataset.follow);

  const friend = event.target.closest("[data-friend]");
  if (friend) toggleFriend(friend.dataset.friend);

  const category = event.target.closest("[data-category]");
  if (category) {
    state.category = category.dataset.category;
    render();
  }

  if (event.target.closest("[data-close-dialog]")) {
    els.dialog.close();
  }

  if (event.target.id === "profileNewMemory") {
    openComposer();
  }

  if (event.target.id === "clearLocalData") {
    clearLocalData();
  }
});

els.openComposer.addEventListener("click", () => {
  openComposer();
});

els.closeComposer.addEventListener("click", () => {
  els.composer.hidden = true;
});

els.accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createAccount(event.currentTarget);
});

els.memoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createPost(event.currentTarget);
});

els.memoryForm.addEventListener("reset", () => {
  setTimeout(updateFileSummary, 0);
});

els.photoInput.addEventListener("change", updateFileSummary);
els.fileInput.addEventListener("change", updateFileSummary);

els.searchInput.addEventListener("input", (event) => {
  state.query = event.currentTarget.value;
  render();
});

els.feedMode.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button) return;
  state.feedMode = button.dataset.mode;
  render();
});

els.dialog.addEventListener("click", (event) => {
  if (event.target === els.dialog) els.dialog.close();
});

render();
