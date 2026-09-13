# Semi-Trax Website — Fixed Package

Static website package for Semi-Trax.

Fixes included:
- Visible Semi-Trax logo/icon in header and footer.
- Responsive North America map overlay using one shared coordinate system.
- Driver markers stay anchored to the map while resizing.
- Cleaner navigation demo controls and spacing.
- Coverage wording updated to 13 Canadian provinces & territories.
- 500K long-term driver target retained.
- Privacy Policy and Terms links retained.

Deploy as a static site. `render.yaml` is included for Render.

Note: the North America base-map image is loaded from the existing Semi-Trax production asset URL so the package uses the current official map artwork.

- Branding updated to use the exact user-provided official Semi-Trax orange truck + X PNG logo.

## Password recovery page (local preparation; not deployed)

`reset-password.html`, `reset-password.css` and `reset-password.js` add a focused
account-recovery page using the existing logo, site stylesheet and typography.
The homepage, assets and existing scripts are unchanged. There is no website
sign-in route or approved app deep link in this repository: the success page
directs drivers to open Semi-Trax and select Sign in. It never accepts a return
URL supplied by the reset link.

### Exact API contract

Reviewed against SemiTraX API `src/server.ts` in deployed revision
`370f9477edfb0c6434ff55487783a5fd75a59221` and corrected candidate
`a8b74e9c697a4c8ffc741273f116736911e346fbce18cad893b9566480eec3c7`.
No API or database changes are part of this website patch.

- Endpoint: `POST https://semitrax-api.onrender.com/auth/password-reset/confirm`.
- JSON body: `{ "token": "<reset token>", "password": "<new password>" }`.
  Confirmation is checked locally and is not sent. No auth header or cookie required.
- Token: API requires a string of at least 40 characters. The reviewed email
  service generates 48 random bytes encoded as base64url, with a one-hour expiry.
- Password: 10–128 JavaScript UTF-16 code units, matching Zod string length.
  No trimming or invented password composition restrictions.
- Success: HTTP 204 with no response body; do not treat other 2xx as success.
- Invalid, expired or used: HTTP 400, `error.code=INVALID_RESET_TOKEN`.
- Invalid body: HTTP 400, `error.code=VALIDATION_ERROR`; reviewed candidate
  supplies `error.details.fieldErrors`. Handle old responses without details too.
- Also handle HTTP 429, 5xx, malformed proxy bodies, network/CORS failures and
  a 15-second timeout. No automatic retries or raw server messages displayed.

The reviewed `src/services/recoveryEmail.ts` emits:

```text
https://www.semitrax.com/reset-password#token=<URL-encoded reset token>
```

The token comes from the fragment, not the query string. It is removed from the
current history entry immediately and retained only in a JavaScript closure;
it is cleared on success, invalid-link response or page departure. Reloading
requires reopening the original email link. No analytics, third-party assets,
token/password logging, localStorage or sessionStorage are used on this page.
User-entered passwords are cleared on completion and page departure. Network
failure is reported as uncertain, because the server might have accepted the
request before the response was lost.

### Local tests

Node 20+; no application build required. The only added dependency is a pinned,
development-only Playwright test runner. It is not loaded by the static page.

```sh
npm ci
npx playwright install chromium
npm test
```

Alternatively set `TEST_BROWSER_CHANNEL=msedge` to use an already installed Edge.
Browser tests start a loopback-only server with the two exact Render route
rewrites, intercept the exact API endpoint, and abort all other external
requests. Synthetic tokens/passwords only. No production database or email
requests. Screenshots are written to ignored `test-results/`.

### Production prerequisites — require separate approval

1. Deploy this website patch only after approval. The local `render.yaml` prepares
   exact rewrites from `/reset-password` and `/reset-password/` to
   `/reset-password.html`, plus scoped no-store, no-referrer, framing and CSP
   headers. No catch-all rewrite or changes to the existing homepage. If this
   Static Site does not sync a Blueprint, equivalent rules require an approved
   Render dashboard change. Existing dashboard rule order must be reviewed.
2. Verify the deployed HTTPS route, headers and assets. Local tests cannot certify
   Render's live routing or settings. See official Render documentation:
   https://render.com/docs/redirects-rewrites and
   https://render.com/docs/static-site-headers.
3. The API must allow the exact `https://www.semitrax.com` CORS origin and JSON
   POST preflight. It being PRESENT in the environment does not prove this
   origin is included. Do not use wildcard CORS or replace other approved origins.
4. Configure approved Resend key and verified sender in the API's server-only
   `RESEND_API_KEY` and `PASSWORD_RESET_FROM_EMAIL`, and set
   `PASSWORD_RESET_BASE_URL=https://www.semitrax.com/reset-password` only after
   the page is actually deployed and verified. Never put keys in this static site.
5. Complete the coordinated rollout of the reviewed backend and migrations:
   the old confirmation endpoint has the same HTTP contract, but does not contain
   the candidate's atomic reset-token claim and new recovery email integration.
6. With separate authorization, prove an actual email and reset round trip using
   a controlled test account, including one-time token use and subsequent login.
   Current local browser tests do not prove inbox delivery or production recovery.

No push, commit, deployment, Render/Resend configuration change, production
request, migration or email send was performed during local implementation.
