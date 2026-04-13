# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Viewer >> loads skill from ?hs= param
- Location: tests/e2e/smoke.spec.ts:167:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=e2e-test').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=e2e-test').first()

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
  72  |   test('settings button opens modal', async ({ page }) => {
  73  |     await page.goto(`${BASE}/composer/`);
  74  |     // Click the settings gear icon
  75  |     const settingsBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
  76  |     // Find button near "export" — settings is before export
  77  |     const gearBtn = page.locator('button:has(svg)').filter({ hasText: '' });
  78  |     // Try clicking any button that might open settings
  79  |     await page.click('button:has(svg.lucide-settings)');
  80  |     await page.waitForTimeout(500);
  81  |     const modal = page.locator('text=System prompt');
  82  |     if (await modal.isVisible()) {
  83  |       await expect(modal).toBeVisible();
  84  |     }
  85  |   });
  86  | 
  87  |   test('export modal works', async ({ page }) => {
  88  |     await page.goto(`${BASE}/composer/`);
  89  |     // Wait for Svelte hydration: the LLM $effect fires client-side and adds
  90  |     // a system message to canvas, which shows a count badge in AgentConsole.
  91  |     // The export button only exists at md+ viewport (hidden md:flex).
  92  |     await page.waitForFunction(
  93  |       () => document.querySelector('button[disabled][class*="statusColor"], select option') !== null,
  94  |       { timeout: 10000 }
  95  |     );
  96  |     await page.waitForTimeout(500); // extra tick for hydration to settle
  97  |     const exportBtn = page.locator('button', { hasText: 'export' });
  98  |     if (await exportBtn.isVisible()) {
  99  |       await exportBtn.click();
  100 |       await expect(page.locator('text=Export Skill')).toBeVisible({ timeout: 5000 });
  101 |       await expect(page.locator('text=skill.json')).toBeVisible({ timeout: 3000 });
  102 |     }
  103 |   });
  104 | 
  105 |   test('mode switching works', async ({ page }) => {
  106 |     await page.goto(`${BASE}/composer/`);
  107 |     // Switch to chat mode
  108 |     await page.click('button:has-text("chat")');
  109 |     await page.waitForTimeout(300);
  110 |     // Switch to auto mode
  111 |     await page.click('button:has-text("auto")');
  112 |     await page.waitForTimeout(300);
  113 |     // Switch back to drag
  114 |     await page.click('button:has-text("drag")');
  115 |   });
  116 | 
  117 |   test('?hs= URL loads a skill', async ({ page }) => {
  118 |     const hs = btoa(JSON.stringify({version:'1.0',name:'test',blocks:[{type:'stat',data:{label:'Test',value:'42',trendDir:'up'}}]}));
  119 |     await page.goto(`${BASE}/composer/?hs=${hs}`);
  120 |     await page.waitForTimeout(1000);
  121 |     // Should have at least 1 block
  122 |     const blocks = page.locator('[role="list"] > div');
  123 |     await expect(blocks.first()).toBeVisible({ timeout: 5000 });
  124 |   });
  125 | 
  126 |   test('chat API responds', async ({ request }) => {
  127 |     const res = await request.post(`${BASE}/composer/api/chat`, {
  128 |       data: { messages: [{ role: 'user', content: 'say ok' }], model: 'claude-haiku-4-5-20251001', max_tokens: 5 },
  129 |     });
  130 |     expect(res.status()).toBe(200);
  131 |     const body = await res.json();
  132 |     expect(body.type).toBe('message');
  133 |   });
  134 | });
  135 | 
  136 | // ─── VIEWER ─────────────────────────────────────────────────────────────────
  137 | 
  138 | test.describe('Viewer', () => {
  139 |   test('loads with correct title', async ({ page }) => {
  140 |     await page.goto(`${BASE}/viewer/`);
  141 |     await expect(page).toHaveTitle(/Viewer/i);
  142 |   });
  143 | 
  144 |   test('shows HyperSkill explanation', async ({ page }) => {
  145 |     await page.goto(`${BASE}/viewer/`);
  146 |     // Check for the explanation text (visible on xl screens)
  147 |     const text = page.locator('text=widget UI portable');
  148 |     // May be hidden on small viewports
  149 |     expect(await text.count()).toBeGreaterThanOrEqual(1);
  150 |   });
  151 | 
  152 |   test('has hyperskills.net link', async ({ page }) => {
  153 |     await page.goto(`${BASE}/viewer/`);
  154 |     const link = page.locator('a[href="https://hyperskills.net"]');
  155 |     expect(await link.count()).toBeGreaterThanOrEqual(1);
  156 |   });
  157 | 
  158 |   test('URL input accepts value and charger button works', async ({ page }) => {
  159 |     await page.goto(`${BASE}/viewer/`);
  160 |     const input = page.locator('input').first();
  161 |     await input.fill('test-url');
  162 |     await expect(input).toHaveValue('test-url');
  163 |     const chargerBtn = page.locator('button', { hasText: 'charger' });
  164 |     await expect(chargerBtn).toBeVisible();
  165 |   });
  166 | 
  167 |   test('loads skill from ?hs= param', async ({ page }) => {
  168 |     const skill = { meta: { title: 'e2e-test' }, content: { blocks: [{ type: 'stat', data: { label: 'E2E', value: '100' } }] } };
  169 |     const hs = btoa(unescape(encodeURIComponent(JSON.stringify(skill))));
  170 |     await page.goto(`${BASE}/viewer/?hs=${hs}`);
  171 |     await page.waitForTimeout(2000);
> 172 |     await expect(page.locator('text=e2e-test').first()).toBeVisible({ timeout: 5000 });
      |                                                         ^ Error: expect(locator).toBeVisible() failed
  173 |   });
  174 | 
  175 |   test('chat API responds', async ({ request }) => {
  176 |     const res = await request.post(`${BASE}/viewer/api/chat`, {
  177 |       data: { messages: [{ role: 'user', content: 'ok' }], model: 'claude-haiku-4-5-20251001', max_tokens: 5 },
  178 |     });
  179 |     expect(res.status()).toBe(200);
  180 |   });
  181 | });
  182 | 
  183 | // ─── SHOWCASE ───────────────────────────────────────────────────────────────
  184 | 
  185 | test.describe('Showcase', () => {
  186 |   test('loads successfully', async ({ page }) => {
  187 |     await page.goto(`${BASE}/showcase/`);
  188 |     await page.waitForSelector('text=UI Showcase', { timeout: 10000 });
  189 |   });
  190 | 
  191 |   test('has all nav sections', async ({ page }) => {
  192 |     await page.goto(`${BASE}/showcase/`);
  193 |     await page.waitForTimeout(2000);
  194 |     for (const section of ['Primitives', 'Blocs simples', 'Widgets riches', 'Gallery', 'D3']) {
  195 |       expect(await page.locator(`text=${section}`).count()).toBeGreaterThanOrEqual(1);
  196 |     }
  197 |   });
  198 | 
  199 |   test('DAG FONC badge visible', async ({ page }) => {
  200 |     await page.goto(`${BASE}/showcase/`);
  201 |     await page.waitForTimeout(2000);
  202 |     const dag = page.locator('text=DAG FONC');
  203 |     expect(await dag.count()).toBeGreaterThanOrEqual(1);
  204 |   });
  205 | 
  206 |   test('MCP input visible', async ({ page }) => {
  207 |     await page.goto(`${BASE}/showcase/`);
  208 |     const input = page.locator('input[placeholder*="MCP"]');
  209 |     await expect(input).toBeVisible();
  210 |   });
  211 | 
  212 |   test('no Marie Dupont', async ({ page }) => {
  213 |     await page.goto(`${BASE}/showcase/`);
  214 |     await page.waitForTimeout(3000);
  215 |     const content = await page.textContent('body');
  216 |     expect(content).not.toContain('Marie Dupont');
  217 |   });
  218 | 
  219 |   test('has Claire Forestier', async ({ page }) => {
  220 |     await page.goto(`${BASE}/showcase/`);
  221 |     await page.waitForTimeout(3000);
  222 |     const content = await page.textContent('body');
  223 |     expect(content).toContain('Claire Forestier');
  224 |   });
  225 | 
  226 |   test('color squares visible on DAG components', async ({ page }) => {
  227 |     await page.goto(`${BASE}/showcase/`);
  228 |     await page.waitForTimeout(3000);
  229 |     // Color squares are small buttons with inline background colors
  230 |     const colorBtns = page.locator('button[style*="background:"]');
  231 |     expect(await colorBtns.count()).toBeGreaterThanOrEqual(5);
  232 |   });
  233 | });
  234 | 
  235 | // ─── MOBILE ─────────────────────────────────────────────────────────────────
  236 | 
  237 | test.describe('Mobile', () => {
  238 |   test('loads successfully', async ({ page }) => {
  239 |     await page.goto(`${BASE}/mobile/`);
  240 |     await expect(page.locator('text=Auto')).toBeVisible({ timeout: 10000 });
  241 |   });
  242 | 
  243 |   test('has hamburger menu', async ({ page }) => {
  244 |     await page.goto(`${BASE}/mobile/`);
  245 |     const hamburger = page.locator('button[aria-label="Menu"]');
  246 |     await expect(hamburger).toBeVisible();
  247 |   });
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
```