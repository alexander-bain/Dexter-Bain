(function () {
  const STORAGE_KEY = "dexter-personal-unlocked";

  function hasPersonalAccess() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "yes";
    } catch (error) {
      return false;
    }
  }

  function rememberPersonalAccess() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "yes");
    } catch (error) {
      // Access still works for this page if session storage is unavailable.
    }
  }

  if (hasPersonalAccess()) return;

  document.documentElement.classList.add("personal-access-locked");

  const gateStyles = document.createElement("style");
  gateStyles.id = "personalAccessStyles";
  gateStyles.textContent = `
    html.personal-access-locked,
    html.personal-access-locked body {
      overflow: hidden !important;
    }

    html.personal-access-locked body > :not(#personalAccessGate) {
      visibility: hidden !important;
    }

    #personalAccessGate {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      overflow: auto;
      padding: 24px;
      visibility: visible !important;
      background: radial-gradient(circle at top, #243b55, #050608 72%);
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #personalAccessGate * {
      box-sizing: border-box;
    }

    .personal-access-card {
      width: min(460px, 100%);
      padding: 30px;
      border: 1px solid rgba(96, 165, 250, 0.42);
      border-radius: 22px;
      background: linear-gradient(135deg, rgba(30, 64, 175, 0.3), rgba(15, 23, 42, 0.96));
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
      text-align: center;
    }

    .personal-access-icon {
      margin-bottom: 10px;
      font-size: 2.2rem;
    }

    .personal-access-card h1 {
      margin: 0 0 8px;
      color: #f8fafc;
      font: 750 1.55rem/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }

    .personal-access-card p {
      margin: 0 0 20px;
      color: #cbd5e1;
      font-size: 0.92rem;
      line-height: 1.5;
    }

    .personal-access-form {
      display: flex;
      gap: 9px;
    }

    .personal-access-input {
      min-width: 0;
      min-height: 48px;
      flex: 1 1 auto;
      padding: 0 14px;
      border: 1px solid rgba(148, 163, 184, 0.58);
      border-radius: 12px;
      outline: none;
      background: rgba(2, 6, 23, 0.88);
      color: #f8fafc;
      font: inherit;
    }

    .personal-access-input:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    .personal-access-button {
      min-height: 48px;
      padding: 0 18px;
      border: 0;
      border-radius: 12px;
      background: linear-gradient(135deg, #60a5fa, #2563eb);
      color: #fff;
      font: inherit;
      font-weight: 750;
      cursor: pointer;
    }

    .personal-access-message {
      min-height: 21px;
      margin: 10px 0 4px !important;
      color: #fca5a5 !important;
      font-size: 0.82rem !important;
    }

    .personal-access-home {
      display: inline-block;
      margin-top: 7px;
      color: #bfdbfe;
      font-size: 0.84rem;
      font-weight: 650;
      text-decoration: none;
    }

    .personal-access-home:hover {
      text-decoration: underline;
    }

    @media (max-width: 520px) {
      #personalAccessGate {
        padding: 16px;
      }

      .personal-access-card {
        padding: 26px 20px;
      }

      .personal-access-form {
        flex-direction: column;
      }

      .personal-access-button {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(gateStyles);

  function showPersonalGate() {
    if (document.querySelector("#personalAccessGate")) return;

    const gate = document.createElement("div");
    gate.id = "personalAccessGate";
    gate.innerHTML = `
      <div class="personal-access-card">
        <div class="personal-access-icon" aria-hidden="true">🔒</div>
        <h1>Personal page</h1>
        <p>Enter the password to continue.</p>
        <form class="personal-access-form" id="personalAccessForm">
          <label for="personalAccessPassword" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">Password</label>
          <input class="personal-access-input" id="personalAccessPassword" type="password" placeholder="Password" autocomplete="current-password" autocapitalize="none" spellcheck="false" />
          <button class="personal-access-button" type="submit">Unlock</button>
        </form>
        <p class="personal-access-message" id="personalAccessMessage" role="status" aria-live="polite"></p>
        <a class="personal-access-home" href="/">Back to DexterBain.com</a>
      </div>
    `;
    document.body.appendChild(gate);

    const form = gate.querySelector("#personalAccessForm");
    const passwordInput = gate.querySelector("#personalAccessPassword");
    const message = gate.querySelector("#personalAccessMessage");

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (passwordInput.value === "Cena") {
        rememberPersonalAccess();
        document.documentElement.classList.remove("personal-access-locked");
        gate.remove();
        gateStyles.remove();
        return;
      }

      passwordInput.setAttribute("aria-invalid", "true");
      message.textContent = "That password is not correct. Try again.";
      passwordInput.select();
    });

    passwordInput.addEventListener("input", () => {
      passwordInput.removeAttribute("aria-invalid");
      message.textContent = "";
    });

    passwordInput.focus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showPersonalGate, { once: true });
  } else {
    showPersonalGate();
  }
})();
