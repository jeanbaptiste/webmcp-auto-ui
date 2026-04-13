# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Composer >> settings button opens modal
- Location: tests/e2e/smoke.spec.ts:72:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://demos.hyperskills.net/composer/
Call log:
  - navigating to "https://demos.hyperskills.net/composer/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const BASE = 'https://demos.hyperskills.net';
  4   | 
  5   | // ─── HOME ──────────────────────────────────────────────────────────────────
  6   | 
  7   | test.describe('Home page', () => {
  8   |   test('loads and shows title', async ({ page }) => {
  9   |     await page.goto(`${BASE}/`);
  10  |     await expect(page).toHaveTitle(/Auto-UI/i);
  11  |   });
  12  | 
  13  |   test('shows all 5 demo cards', async ({ page }) => {
  14  |     await page.goto(`${BASE}/`);
  15  |     await page.waitForSelector('a[href*="/composer"]');
  16  |     const cards = await page.locator('a[href*="demos.hyperskills.net"]').count();
  17  |     expect(cards).toBeGreaterThanOrEqual(5);
  18  |   });
  19  | 
  20  |   test('card links point to correct domains', async ({ page }) => {
  21  |     await page.goto(`${BASE}/`);
  22  |     await page.waitForSelector('a[href*="/composer"]');
  23  |     for (const path of ['/composer', '/viewer', '/showcase', '/mobile', '/todo']) {
  24  |       const link = page.locator(`a[href*="${path}"]`).first();
  25  |       await expect(link).toBeVisible();
  26  |       const href = await link.getAttribute('href');
  27  |       expect(href).toContain('demos.hyperskills.net');
  28  |     }
  29  |   });
  30  | });
  31  | 
  32  | // ─── COMPOSER ───────────────────────────────────────────────────────────────
  33  | 
  34  | test.describe('Composer', () => {
  35  |   test('loads with Auto-UI title', async ({ page }) => {
  36  |     await page.goto(`${BASE}/composer/`);
  37  |     await expect(page).toHaveTitle(/Auto-UI/i);
  38  |     await expect(page.locator('text=Auto').first()).toBeVisible();
  39  |   });
  40  | 
  41  |   test('default mode is drag & drop', async ({ page }) => {
  42  |     await page.goto(`${BASE}/composer/`);
  43  |     // The drag button should have active styling
  44  |     const dragBtn = page.locator('button', { hasText: 'drag & drop' });
  45  |     await expect(dragBtn).toBeVisible();
  46  |   });
  47  | 
  48  |   test('no hyperskills URL button in topbar', async ({ page }) => {
  49  |     await page.goto(`${BASE}/composer/`);
  50  |     const hsBtn = page.locator('button', { hasText: 'hyperskills URL' });
  51  |     await expect(hsBtn).toHaveCount(0);
  52  |   });
  53  | 
  54  |   test('LLM selector has all 4 options', async ({ page }) => {
  55  |     await page.goto(`${BASE}/composer/`);
  56  |     const select = page.locator('select').first();
  57  |     const options = await select.locator('option').allTextContents();
  58  |     expect(options).toContain('claude-haiku-4-5');
  59  |     expect(options).toContain('claude-sonnet-4-6');
  60  |     expect(options.some(o => o.includes('Gemma E2B'))).toBe(true);
  61  |     expect(options.some(o => o.includes('Gemma E4B'))).toBe(true);
  62  |   });
  63  | 
  64  |   test('MCP URL input is functional', async ({ page }) => {
  65  |     await page.goto(`${BASE}/composer/`);
  66  |     const input = page.locator('input[placeholder*="mcp"]').first();
  67  |     await expect(input).toBeVisible();
  68  |     await input.fill('https://mcp.code4code.eu/mcp');
  69  |     await expect(input).toHaveValue('https://mcp.code4code.eu/mcp');
  70  |   });
  71  | 
  72  |   test('settings button opens modal', async ({ page }) => {
> 73  |     await page.goto(`${BASE}/composer/`);
      |                ^ Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://demos.hyperskills.net/composer/
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
  172 |     await expect(page.locator('text=e2e-test').first()).toBeVisible({ timeout: 5000 });
  173 |   });
```