import scoreStore from "../score-store.js";

const elements = {
  createButton: document.querySelector("#createButton"),
  currentUsername: document.querySelector("#currentUsername"),
  form: document.querySelector("#accountForm"),
  password: document.querySelector("#password"),
  signedIn: document.querySelector("#signedIn"),
  signOutButton: document.querySelector("#signOutButton"),
  status: document.querySelector("#accountStatus"),
  username: document.querySelector("#username")
};

function render() {
  const account = scoreStore.currentAccount();
  elements.signedIn.hidden = !account;
  elements.form.hidden = Boolean(account);
  elements.currentUsername.textContent = account?.username || "";
  if (!account) elements.username.focus();
}

function setBusy(isBusy) {
  elements.form.querySelectorAll("button, input").forEach((control) => { control.disabled = isBusy; });
}

async function authenticate(action) {
  elements.status.textContent = "";
  setBusy(true);
  try {
    const account = await action(elements.username.value, elements.password.value);
    elements.password.value = "";
    elements.status.textContent = `Saved. You are signed in as ${account.username}.`;
    render();
  } catch (error) {
    elements.status.textContent = error.message || "Could not save the account.";
  } finally {
    setBusy(false);
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  authenticate(scoreStore.signIn);
});

elements.createButton.addEventListener("click", () => {
  authenticate(scoreStore.createAccount);
});

elements.signOutButton.addEventListener("click", () => {
  scoreStore.signOut();
  elements.status.textContent = "Signed out.";
  render();
});

render();
