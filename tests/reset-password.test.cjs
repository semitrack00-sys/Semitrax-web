const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const endpoint = 'https://semitrax-api.onrender.com/auth/password-reset/confirm';
// Synthetic fixtures only. Every API request is intercepted; no production request occurs.
const token = 'synthetic-reset-token-'.repeat(4);
const validPassword = 'synthetic test password';
let browser, server, origin;
const localRequests = [];

before(async () => {
  server = http.createServer(async (req, res) => {
    localRequests.push(req.url);
    let name = new URL(req.url, 'http://localhost').pathname;
    if (name === '/reset-password' || name === '/reset-password/') name = '/reset-password.html';
    if (name === '/') name = '/index.html';
    const allowed = ['/index.html', '/reset-password.html', '/reset-password.js', '/reset-password.css', '/style.css', '/semi-trax-logo.png', '/privacy.html', '/terms.html'];
    if (!allowed.includes(name)) { res.writeHead(404); return res.end(); }
    const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png' };
    res.setHeader('Content-Type', types[path.extname(name)]);
    if (name.startsWith('/reset-password')) {
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Frame-Options', 'DENY');
    }
    res.end(await fs.readFile(path.join(root, name)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, ...(process.env.TEST_BROWSER_CHANNEL ? { channel: process.env.TEST_BROWSER_CHANNEL } : {}) });
});
after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });

async function pageFor(t, reply, suffix = `#token=${token}`, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport });
  t.after(() => context.close());
  const requests = [], consoleErrors = [], blockedExternal = [];
  // Abort every non-local request other than the intercepted exact confirm endpoint.
  await context.route('**/*', async route => {
    const request = route.request();
    if (request.url() === endpoint) {
      requests.push({ url: request.url(), method: request.method(), body: request.postDataJSON(), headers: request.headers() });
      if (reply) return reply(route);
      return route.fulfill({ status: 204 });
    }
    if (request.url().startsWith(origin + '/')) return route.continue();
    blockedExternal.push(request.url());
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => consoleErrors.push(error.message));
  await page.goto(`${origin}/reset-password${suffix}`);
  await page.waitForFunction(() => !location.hash && !location.search);
  t.after(() => { assert.deepEqual(consoleErrors, []); assert.deepEqual(blockedExternal, []); });
  return { page, requests };
}
async function fill(page, password = validPassword, confirmation = password) {
  await page.locator('#new-password').fill(password);
  await page.locator('#confirm-password').fill(confirmation);
}
async function submit(page) { await page.locator('#reset-submit').click(); }
async function waitError(page, text) { await page.locator('#reset-error').filter({ hasText: text }).waitFor(); }

test('exact production contract: fragment token, untrimmed password, POST JSON and 204 success', async t => {
  const { page, requests } = await pageFor(t);
  const password = '  exact password with spaces  ';
  await fill(page, password); await submit(page);
  await page.locator('#reset-success').waitFor();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, endpoint);
  assert.equal(requests[0].method, 'POST');
  assert.deepEqual(requests[0].body, { token, password });
  assert.equal(requests[0].headers['content-type'], 'application/json');
  assert.equal(requests[0].headers.authorization, undefined);
  assert.equal(requests[0].headers.cookie, undefined);
  assert.equal(requests[0].headers.referer, undefined);
  assert.equal(await page.locator('#new-password').inputValue(), '');
  assert.equal(await page.locator('#confirm-password').inputValue(), '');
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.ok(!localRequests.some(url => url.includes(token)));
  await page.getByRole('link', { name: 'Return to sign-in' }).click();
  assert.equal(new URL(page.url()).origin, origin);
  assert.ok(await page.locator('#sign-in-help').isVisible());
});

test('missing, short, duplicate and query-string tokens fail closed without requests', async t => {
  for (const suffix of ['', '#token=short', `#token=${token}&token=${token}`, `?token=${token}`, `?token=bad#token=${token}`]) {
    const { page, requests } = await pageFor(t, null, suffix);
    await waitError(page, 'missing, invalid or expired');
    assert.equal(await page.locator('#reset-form').isVisible(), false);
    assert.equal(requests.length, 0);
  }
});

test('password boundaries, matching, field focus and no invented complexity rules', async t => {
  const { page, requests } = await pageFor(t);
  await fill(page, 'a'.repeat(9)); await submit(page);
  assert.equal(await page.locator('#new-password').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'new-password');
  await fill(page, 'a'.repeat(10), 'different pass'); await submit(page);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'confirm-password');
  // Bypass HTML maxlength to exercise JS's upper bound as well.
  await page.evaluate(() => { document.querySelector('#new-password').value = 'a'.repeat(129); document.querySelector('#confirm-password').value = 'a'.repeat(129); });
  await submit(page); assert.equal(requests.length, 0);
  for (const length of [10, 128]) {
    const { page: boundaryPage, requests: boundaryRequests } = await pageFor(t);
    await fill(boundaryPage, 'a'.repeat(length)); await submit(boundaryPage);
    await boundaryPage.locator('#reset-success').waitFor();
    assert.equal(boundaryRequests[0].body.password.length, length);
  }
});

test('invalid/expired/used token response and untrusted error text are handled safely', async t => {
  const { page } = await pageFor(t, route => route.fulfill({ status: 400, json: { error: { code: 'INVALID_RESET_TOKEN', message: '<img src=x onerror=alert(1)>' } } }));
  await fill(page); await submit(page); await waitError(page, 'invalid or expired');
  assert.equal(await page.locator('#reset-form').isVisible(), false);
  assert.equal(await page.locator('#new-password').inputValue(), '');
  assert.ok(!(await page.locator('body').innerText()).includes('onerror'));
});

test('validation, rate limit, unavailable, malformed and unexpected success responses do not claim success', async t => {
  const cases = [
    [400, { error: { code: 'VALIDATION_ERROR', details: { fieldErrors: { password: ['Invalid value'] } } } }, 'not accepted'],
    [429, { error: { code: 'RATE_LIMITED' } }, 'Too many attempts'],
    [503, { error: { code: 'DATABASE_UNAVAILABLE' } }, 'temporarily unavailable'],
    [502, '<html>upstream private details</html>', 'temporarily unavailable'],
    [200, { ok: true }, 'temporarily unavailable'],
  ];
  for (const [status, body, message] of cases) {
    const { page } = await pageFor(t, route => route.fulfill(typeof body === 'string' ? { status, body, contentType: 'text/html' } : { status, json: body }));
    await fill(page); await submit(page); await waitError(page, message);
    assert.equal(await page.locator('#reset-success').isVisible(), false);
    assert.equal(await page.locator('#reset-submit').isEnabled(), true);
    assert.ok(!(await page.locator('body').innerText()).includes('upstream private'));
  }
});

test('network/CORS failure allows explicit retry, never automatic POST retry', async t => {
  const { page, requests } = await pageFor(t, route => route.abort('failed'));
  await fill(page); await submit(page); await waitError(page, 'could not confirm');
  assert.equal(requests.length, 1);
  assert.equal(await page.locator('#reset-submit').isEnabled(), true);
});

test('timeout ends busy state and reports uncertain result', async t => {
  const { page, requests } = await pageFor(t, async () => {});
  await page.clock.install(); await fill(page); await submit(page);
  await page.clock.fastForward(16000); await waitError(page, 'could not confirm');
  assert.equal(requests.length, 1);
  assert.equal(await page.locator('#reset-submit').isEnabled(), true);
});

test('busy state prevents duplicate submission and shows progress', async t => {
  let release;
  const { page, requests } = await pageFor(t, route => new Promise(resolve => { release = async () => { await route.fulfill({ status: 204 }); resolve(); }; }));
  await fill(page); await submit(page);
  await page.waitForFunction(() => document.querySelector('#reset-fields').disabled);
  assert.equal(await page.locator('#reset-form').getAttribute('aria-busy'), 'true');
  assert.match(await page.locator('#reset-progress').innerText(), /Please wait/);
  await page.locator('#reset-form').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
  await page.waitForTimeout(50);
  assert.equal(requests.length, 1); await release();
  await page.locator('#reset-success').waitFor();
});

test('password visibility, safe links, refresh, and back-forward privacy', async t => {
  const { page } = await pageFor(t, null, `?returnTo=https://untrusted.invalid/#token=${token}`);
  await fill(page);
  await page.getByRole('button', { name: 'Show new password', exact: true }).click();
  assert.equal(await page.locator('#new-password').getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Hide new password', exact: true }).click();
  assert.equal(await page.locator('#new-password').getAttribute('type'), 'password');
  assert.ok((await page.locator('a').evaluateAll(links => links.map(a => a.getAttribute('href')))).every(href => href.startsWith('/') || href === '#sign-in-help'));
  await page.evaluate(() => { dispatchEvent(new PageTransitionEvent('pagehide')); dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
  assert.equal(await page.locator('#new-password').inputValue(), '');
  await waitError(page, 'missing, invalid or expired');
  await page.reload(); await waitError(page, 'missing, invalid or expired');
});

test('mobile/tablet/desktop layout, original logo, and local screenshot evidence', async t => {
  const dir = path.join(root, 'test-results'); await fs.mkdir(dir, { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    const { page } = await pageFor(t, null, `#token=${token}`, { width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('.brand-logo').evaluate(img => img.complete && img.naturalWidth > 0), true);
    assert.equal(await page.locator('#new-password').evaluate(input => getComputedStyle(input).fontSize), '16px');
    assert.equal(await page.locator('#reset-submit').isVisible(), true);
    await page.screenshot({ path: path.join(dir, `reset-${width}.png`), fullPage: true });
  }
});

test('no-JavaScript form cannot submit or expose token via form navigation', async t => {
  const context = await browser.newContext({ javaScriptEnabled: false }); t.after(() => context.close());
  const page = await context.newPage(); await page.goto(`${origin}/reset-password#token=${token}`);
  assert.equal(await page.locator('#reset-form').isVisible(), false);
  assert.match(await page.locator('noscript').innerText(), /Enable JavaScript/);
});

test('Render exact-route rewrites, scoped headers, and no homepage behavior changes', async () => {
  const yaml = await fs.readFile(path.join(root, 'render.yaml'), 'utf8');
  assert.match(yaml, /source: \/reset-password\s+destination: \/reset-password.html/);
  assert.match(yaml, /source: \/reset-password\/\s+destination: \/reset-password.html/);
  assert.match(yaml, /name: Cache-Control\s+value: no-store/);
  assert.match(yaml, /frame-ancestors 'none'/);
  const script = await fs.readFile(path.join(root, 'reset-password.js'), 'utf8');
  assert.doesNotMatch(script, /console\.|localStorage|sessionStorage|innerHTML|document\.cookie/);
  const html = await fs.readFile(path.join(root, 'reset-password.html'), 'utf8');
  assert.doesNotMatch(html, /src="https?:|script\.js"/);
  assert.match(html, /form-action 'none'/);
});
