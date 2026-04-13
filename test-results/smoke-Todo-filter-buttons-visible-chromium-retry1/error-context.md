# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Todo >> filter buttons visible
- Location: tests/e2e/smoke.spec.ts:344:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text("Tous")')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('button:has-text("Tous")')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "401 Authorization Required" [level=1] [ref=e3]
  - separator [ref=e4]
  - generic [ref=e5]: nginx
```

# Test source

```ts
  248 | 
  249 |   test('drawer opens and has MCP section', async ({ page }) => {
  250 |     await page.goto(`${BASE}/mobile/`);
  251 |     await page.click('button[aria-label="Menu"]');
  252 |     await page.waitForTimeout(500);
  253 |     await expect(page.locator('text=Serveur MCP')).toBeVisible();
  254 |   });
  255 | 
  256 |   test('drawer has LLM selector with Gemma options', async ({ page }) => {
  257 |     await page.goto(`${BASE}/mobile/`);
  258 |     await page.click('button[aria-label="Menu"]');
  259 |     await page.waitForTimeout(500);
  260 |     const select = page.locator('select');
  261 |     const options = await select.locator('option').allTextContents();
  262 |     expect(options.some(o => o.includes('Gemma E2B'))).toBe(true);
  263 |     expect(options.some(o => o.includes('Gemma E4B'))).toBe(true);
  264 |   });
  265 | 
  266 |   test('no Bearer token input', async ({ page }) => {
  267 |     await page.goto(`${BASE}/mobile/`);
  268 |     await page.click('button[aria-label="Menu"]');
  269 |     await page.waitForTimeout(500);
  270 |     const content = await page.textContent('.drawer');
  271 |     expect(content).not.toContain('Bearer token');
  272 |   });
  273 | 
  274 |   test('no API key input', async ({ page }) => {
  275 |     await page.goto(`${BASE}/mobile/`);
  276 |     await page.click('button[aria-label="Menu"]');
  277 |     await page.waitForTimeout(500);
  278 |     const content = await page.textContent('.drawer');
  279 |     expect(content).not.toContain('Clé API');
  280 |   });
  281 | 
  282 |   test('drawer has recipes section', async ({ page }) => {
  283 |     await page.goto(`${BASE}/mobile/`);
  284 |     await page.click('button[aria-label="Menu"]');
  285 |     await page.waitForTimeout(500);
  286 |     await expect(page.locator('text=Recettes')).toBeVisible();
  287 |   });
  288 | 
  289 |   test('share button visible', async ({ page }) => {
  290 |     await page.goto(`${BASE}/mobile/`);
  291 |     await page.click('button[aria-label="Menu"]');
  292 |     await page.waitForTimeout(500);
  293 |     await expect(page.locator('text=partager')).toBeVisible();
  294 |   });
  295 | 
  296 |   test('theme toggle button exists', async ({ page }) => {
  297 |     await page.goto(`${BASE}/mobile/`);
  298 |     const toggle = page.locator('button[aria-label="Toggle theme"]');
  299 |     await expect(toggle).toBeVisible();
  300 |   });
  301 | 
  302 |   test('chat API responds', async ({ request }) => {
  303 |     const res = await request.post(`${BASE}/mobile/api/chat`, {
  304 |       data: { messages: [{ role: 'user', content: 'ok' }], model: 'claude-haiku-4-5-20251001', max_tokens: 5 },
  305 |     });
  306 |     expect(res.status()).toBe(200);
  307 |   });
  308 | 
  309 |   test('MCP connect works', async ({ page }) => {
  310 |     await page.goto(`${BASE}/mobile/`);
  311 |     await page.click('button[aria-label="Menu"]');
  312 |     await page.waitForTimeout(500);
  313 |     const input = page.locator('input[placeholder*="mcp"]');
  314 |     await input.fill('https://mcp.code4code.eu/mcp');
  315 |     const connectBtn = page.locator('button', { hasText: /Connecter/i });
  316 |     await connectBtn.click();
  317 |     // Wait for connection attempt
  318 |     await page.waitForTimeout(5000);
  319 |     // Should show connected status or connection message in feed
  320 |     const body = await page.textContent('body');
  321 |     expect(body?.includes('connecté') || body?.includes('connexion') || body?.includes('MCP')).toBe(true);
  322 |   });
  323 | });
  324 | 
  325 | // ─── TODO ───────────────────────────────────────────────────────────────────
  326 | 
  327 | test.describe('Todo', () => {
  328 |   test('loads successfully', async ({ page }) => {
  329 |     await page.goto(`${BASE}/todo/`);
  330 |     await page.waitForTimeout(2000);
  331 |     await expect(page.locator('input[placeholder*="tâche"], input[placeholder*="Nouvelle"]')).toBeVisible();
  332 |   });
  333 | 
  334 |   test('add todo works', async ({ page }) => {
  335 |     await page.goto(`${BASE}/todo/`);
  336 |     await page.waitForTimeout(2000);
  337 |     const input = page.locator('input[placeholder*="tâche"], input[placeholder*="Nouvelle"]').first();
  338 |     await input.fill('E2E test task');
  339 |     await page.click('button:has-text("Ajouter")');
  340 |     await page.waitForTimeout(500);
  341 |     await expect(page.locator('text=E2E test task')).toBeVisible();
  342 |   });
  343 | 
  344 |   test('filter buttons visible', async ({ page }) => {
  345 |     await page.goto(`${BASE}/todo/`);
  346 |     await page.waitForTimeout(2000);
  347 |     for (const label of ['Tous', 'Actifs']) {
> 348 |       await expect(page.locator(`button:has-text("${label}")`)).toBeVisible();
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  349 |     }
  350 |     await expect(page.getByRole('button', { name: 'Terminés', exact: true })).toBeVisible();
  351 |   });
  352 | });
  353 | 
  354 | // ─── CROSS-CUTTING ──────────────────────────────────────────────────────────
  355 | 
  356 | test.describe('Cross-cutting', () => {
  357 |   test('all pages return 200', async ({ request }) => {
  358 |     for (const path of ['/', '/composer/', '/viewer/', '/showcase/', '/mobile/', '/todo/']) {
  359 |       const res = await request.get(`${BASE}${path}`);
  360 |       expect(res.status(), `${path} should be 200`).toBe(200);
  361 |     }
  362 |   });
  363 | 
  364 |   test('all assets load (no 404)', async ({ page }) => {
  365 |     const failures: string[] = [];
  366 |     page.on('response', (res) => {
  367 |       if (res.status() >= 400 && !res.url().includes('fonts.googleapis.com')) {
  368 |         failures.push(`${res.status()} ${res.url()}`);
  369 |       }
  370 |     });
  371 |     await page.goto(`${BASE}/composer/`);
  372 |     await page.waitForTimeout(3000);
  373 |     expect(failures).toEqual([]);
  374 |   });
  375 | 
  376 |   test('MCP server is reachable', async ({ request }) => {
  377 |     const res = await request.post('https://mcp.code4code.eu/mcp', {
  378 |       headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
  379 |       data: { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'e2e', version: '1.0' } } },
  380 |     });
  381 |     expect(res.status()).toBe(200);
  382 |   });
  383 | });
  384 | 
```