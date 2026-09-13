(() => {
  "use strict";
  // Public API address only. No credential, server environment or runtime URL override.
  const endpoint = "https://semitrax-api.onrender.com/auth/password-reset/confirm";
  const form = document.getElementById("reset-form");
  const fields = document.getElementById("reset-fields");
  const password = document.getElementById("new-password");
  const confirm = document.getElementById("confirm-password");
  const error = document.getElementById("reset-error");
  const progress = document.getElementById("reset-progress");
  const submit = document.getElementById("reset-submit");
  const invalidLink = "This reset link is missing, invalid or expired. Request a new link using Forgot Password in the Semi-Trax app.";
  let token = "";
  let busy = false;
  let controller;

  function notice(message) {
    error.textContent = message;
    error.hidden = !message;
  }
  function clearPasswords() {
    form.reset();
    for (const button of document.querySelectorAll("[data-toggle]")) {
      document.getElementById(button.dataset.toggle).type = "password";
      button.textContent = "Show";
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", button.dataset.toggle === "new-password" ? "Show new password" : "Show confirmation password");
    }
  }
  function rejectLink() {
    token = "";
    clearPasswords();
    form.hidden = true;
    notice(invalidLink);
  }
  // recoveryEmail.ts emits #token=... . Do not accept a query-string token or return URL.
  // Remove the credential from this history entry; retain it only in this closure.
  try {
    const url = new URL(window.location.href);
    const tokens = new URLSearchParams(url.hash.slice(1)).getAll("token");
    history.replaceState(null, "", url.pathname);
    if (!url.searchParams.has("token") && tokens.length === 1 && tokens[0].length >= 40) token = tokens[0];
  } catch {
    // Fail closed when browser history cannot be scrubbed; never log the URL.
  }
  if (!token) rejectLink();
  else form.hidden = false;

  for (const button of document.querySelectorAll("[data-toggle]")) {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.toggle);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute("aria-label", `${show ? "Hide" : "Show"} ${input === password ? "new" : "confirmation"} password`);
    });
  }
  function fieldError(input, id, message) {
    const element = document.getElementById(id);
    element.textContent = message;
    element.hidden = !message;
    input.setAttribute("aria-invalid", String(Boolean(message)));
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !token) return;
    notice("");
    // Match z.string().min(10).max(128): JS UTF-16 length, no trim or invented composition rules.
    const passwordError = password.value.length < 10 || password.value.length > 128 ? "Use between 10 and 128 characters." : "";
    const confirmError = confirm.value !== password.value || !confirm.value ? "Passwords must match." : "";
    fieldError(password, "password-error", passwordError);
    fieldError(confirm, "confirm-error", confirmError);
    if (passwordError || confirmError) {
      (passwordError ? password : confirm).focus();
      return;
    }
    busy = true;
    fields.disabled = true;
    form.setAttribute("aria-busy", "true");
    submit.textContent = "Updating password…";
    progress.textContent = "Updating your password. Please wait.";
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: "POST", mode: "cors", credentials: "omit", cache: "no-store",
        redirect: "error", referrerPolicy: "no-referrer", signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, password: password.value }),
      });
      if (response.status === 204) {
        token = "";
        clearPasswords();
        form.hidden = true;
        document.getElementById("reset-intro").hidden = true;
        document.getElementById("reset-success").hidden = false;
        document.getElementById("success-title").focus();
        return;
      }
      let result;
      try { result = await response.json(); } catch { /* Proxy errors may be HTML; never display them. */ }
      if (response.status === 400 && result?.error?.code === "INVALID_RESET_TOKEN") {
        rejectLink();
      } else if (response.status === 400 && result?.error?.code === "VALIDATION_ERROR") {
        if (result.error.details?.fieldErrors?.token) rejectLink();
        else {
          fieldError(password, "password-error", "Use between 10 and 128 characters, then try again.");
          notice("The password reset request was not accepted. Check your password and try again.");
        }
      } else if (response.status === 429) {
        notice("Too many attempts. Please wait a minute before trying again.");
      } else {
        notice("Password recovery is temporarily unavailable. Please try again later.");
      }
    } catch {
      notice("We could not confirm the password update. Check your connection. If this link no longer works, try signing in with your new password or request a new reset link.");
    } finally {
      clearTimeout(timeout);
      busy = false;
      fields.disabled = false;
      form.setAttribute("aria-busy", "false");
      progress.textContent = "";
      submit.textContent = "Reset password";
      if (password.getAttribute("aria-invalid") === "true" && !form.hidden) password.focus();
    }
  });
  // Avoid retaining the reset credential or password in a restored back/forward page.
  window.addEventListener("pagehide", () => { controller?.abort(); token = ""; clearPasswords(); });
  window.addEventListener("pageshow", event => { if (event.persisted) { document.getElementById("reset-success").hidden = true; rejectLink(); } });
})();
