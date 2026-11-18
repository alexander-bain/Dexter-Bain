(() => {
  const gameOrigin = "https://rack-royale.dexterhbain.chatgpt.site";
  const frame = document.querySelector("#rack-game");
  const loadingScreen = document.querySelector("#loading-screen");
  const loadingMessage = document.querySelector("#loading-message");
  const fallbackLink = document.querySelector("#fallback-link");
  const gameUrl = new URL("/", gameOrigin);

  gameUrl.search = window.location.search;
  gameUrl.hash = window.location.hash;
  frame.src = gameUrl.href;
  fallbackLink.href = gameUrl.href;

  let finishedLoading = false;

  const showGame = () => {
    if (finishedLoading) return;
    finishedLoading = true;
    frame.classList.add("is-ready");
    loadingScreen.classList.add("is-hidden");
  };

  frame.addEventListener("load", showGame, { once: true });

  window.setTimeout(() => {
    if (finishedLoading) return;
    loadingMessage.textContent = "The game is taking longer than usual to open.";
    fallbackLink.classList.add("is-visible");
  }, 9000);

  window.addEventListener("message", (event) => {
    if (event.origin !== gameOrigin || event.data?.type !== "rack-royale-room") return;

    const roomCode = String(event.data.code || "").toUpperCase();
    if (!/^[A-Z2-9]{5}$/.test(roomCode)) return;

    const publicUrl = new URL(window.location.href);
    publicUrl.searchParams.set("room", roomCode);
    window.history.replaceState(null, "", publicUrl);
  });
})();
