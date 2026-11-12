# Step 21 — Driver web account foundation

Status: Partially Fixed. Prepared for review, not deployed.

Root cause: the website had marketing and password-reset pages, but no driver account interface. This separate /driver/ page uses the previously audited API contracts: POST /auth/login, GET/PATCH /me, GET /trucks, POST /auth/logout. Profile changes synchronize through the server. Truck specifications are read-only and this interface cannot bypass truck verification.

Files changed: driver/index.html, driver/style.css, driver/api.mjs, driver/app.mjs, driver/sw.js, driver/manifest.webmanifest, driver/VERIFICATION.md, tests/driver-api.test.cjs, package.json, render.yaml.

Sessions stay in memory. Requests have a 15-second deadline, cancel at sign-out and reject stale responses. Writes are never automatically retried. Authentication expiry clears local state. Logout reports when server revocation could not be confirmed. The service worker only caches the page shell; no API responses or credentials are cached. Reloading requires sign-in.

Tests: seven Node regression tests passed; JavaScript syntax and git whitespace checks passed. Covers API contracts, late login/profile responses, expiry, failed logout, service-worker exclusions and malformed authentication responses. Synthetic fixtures only; no live account/profile operation occurred.

Unverified: browser layout, CSP delivery, PWA installation, airplane-mode shell behavior, live API CORS/authentication and existing password-reset browser suite. No physical Android verification. Browser map rendering, destination search and truck-safe planning are not implemented. Provider licenses/configuration need verification before those features can be enabled. Native CoPilot guidance remains Android-only, clearly stated in the interface.

Branch: codex/step-21-driver-account-web in semitrack00-sys/Semitrax-web. Previous unpublished work was restored after the temporary workspace reset; previous GitHub creation was blocked by a workspace-credit review failure. No production deployment, billing change or APK build. Step 22 remains blocked by device/provider acceptance, remaining web features and unresolved security findings.

## Browser validation and recovery follow-up

The desktop sign-in layout was inspected in the cloud browser. The new Forgot password disclosure expands to an accessible email field and Send reset email button. Recovery uses POST /auth/password-reset/request with no Authorization header and a neutral success message. No email was sent and no actual login/profile change was attempted. Nine Node tests now pass, including recovery request serialization and rate-limit behavior. Updated the shell cache version for the changed interface.

Additional files changed: driver/index.html, driver/style.css, driver/app.mjs, driver/api.mjs, driver/sw.js, tests/driver-api.test.cjs and this report. Mobile viewport, real recovery delivery, authenticated browser flows, PWA installation and offline runtime verification remain pending. Desktop rendering alone does not establish those behaviors.
