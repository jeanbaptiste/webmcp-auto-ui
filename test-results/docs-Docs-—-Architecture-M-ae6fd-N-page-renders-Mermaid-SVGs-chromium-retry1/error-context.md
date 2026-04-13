# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: docs.spec.ts >> Docs — Architecture Mermaid >> EN page renders Mermaid SVGs
- Location: tests/e2e/docs.spec.ts:96:7

# Error details

```
Error: page.goto: net::ERR_NETWORK_CHANGED at https://jeanbaptiste.github.io/webmcp-auto-ui/en/guide/architecture/
Call log:
  - navigating to "https://jeanbaptiste.github.io/webmcp-auto-ui/en/guide/architecture/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const DOCS = 'https://jeanbaptiste.github.io/webmcp-auto-ui';
  4   | 
  5   | // ─── GETTING STARTED (FR) ─────────────────────────────────────────────────
  6   | 
  7   | test.describe('Docs — Getting Started FR', () => {
  8   |   test('page loads', async ({ page }) => {
  9   |     await page.goto(`${DOCS}/guide/getting-started/`);
  10  |     await expect(page.locator('h1')).toContainText('démarrage');
  11  |   });
  12  | 
  13  |   test('boilerplate degit command is present', async ({ page }) => {
  14  |     await page.goto(`${DOCS}/guide/getting-started/`);
  15  |     const content = await page.textContent('body');
  16  |     expect(content).toContain('npx degit');
  17  |     expect(content).toContain('boilerplate');
  18  |   });
  19  | 
  20  |   test('uses npm not pnpm', async ({ page }) => {
  21  |     await page.goto(`${DOCS}/guide/getting-started/`);
  22  |     const content = await page.textContent('body');
  23  |     expect(content).toContain('npm install');
  24  |     expect(content).not.toContain('pnpm install');
  25  |   });
  26  | 
  27  |   test('uses proxyUrl not apiKey', async ({ page }) => {
  28  |     await page.goto(`${DOCS}/guide/getting-started/`);
  29  |     const content = await page.textContent('body');
  30  |     expect(content).toContain('proxyUrl');
  31  |     expect(content).not.toContain("model: 'claude-3-5-sonnet");
  32  |   });
  33  | 
  34  |   test('lists current apps (flex2, showcase2)', async ({ page }) => {
  35  |     await page.goto(`${DOCS}/guide/getting-started/`);
  36  |     const content = await page.textContent('body');
  37  |     expect(content).toContain('flex2/');
  38  |     expect(content).toContain('showcase2/');
  39  |     expect(content).toContain('todo2/');
  40  |     expect(content).toContain('viewer2/');
  41  |   });
  42  | 
  43  |   test('has Tricoteuses tutorial link', async ({ page }) => {
  44  |     await page.goto(`${DOCS}/guide/getting-started/`);
  45  |     const link = page.locator('a[href*="create-custom-widget"]');
  46  |     await expect(link).toBeVisible();
  47  |   });
  48  | 
  49  |   test('internal links are relative (no absolute /guide/)', async ({ page }) => {
  50  |     await page.goto(`${DOCS}/guide/getting-started/`);
  51  |     const absoluteLinks = await page.locator('a[href^="/guide/"]').count();
  52  |     expect(absoluteLinks).toBe(0);
  53  |   });
  54  | });
  55  | 
  56  | // ─── GETTING STARTED (EN) ─────────────────────────────────────────────────
  57  | 
  58  | test.describe('Docs — Getting Started EN', () => {
  59  |   test('page loads', async ({ page }) => {
  60  |     await page.goto(`${DOCS}/en/guide/getting-started/`);
  61  |     await expect(page.locator('h1')).toContainText('Getting Started');
  62  |   });
  63  | 
  64  |   test('boilerplate degit command is present', async ({ page }) => {
  65  |     await page.goto(`${DOCS}/en/guide/getting-started/`);
  66  |     const content = await page.textContent('body');
  67  |     expect(content).toContain('npx degit');
  68  |     expect(content).toContain('boilerplate');
  69  |   });
  70  | 
  71  |   test('uses proxyUrl not apiKey', async ({ page }) => {
  72  |     await page.goto(`${DOCS}/en/guide/getting-started/`);
  73  |     const content = await page.textContent('body');
  74  |     expect(content).toContain('proxyUrl');
  75  |     expect(content).not.toContain("model: 'claude-3-5-sonnet");
  76  |   });
  77  | 
  78  |   test('has Tricoteuses tutorial link', async ({ page }) => {
  79  |     await page.goto(`${DOCS}/en/guide/getting-started/`);
  80  |     const link = page.locator('a[href*="create-custom-widget"]');
  81  |     await expect(link).toBeVisible();
  82  |   });
  83  | });
  84  | 
  85  | // ─── ARCHITECTURE — MERMAID SVG ───────────────────────────────────────────
  86  | 
  87  | test.describe('Docs — Architecture Mermaid', () => {
  88  |   test('FR page renders Mermaid SVGs', async ({ page }) => {
  89  |     await page.goto(`${DOCS}/guide/architecture/`);
  90  |     // Mermaid renders into SVG elements
  91  |     await page.waitForTimeout(3000);
  92  |     const svgs = await page.locator('svg[id^="mermaid"]').count();
  93  |     expect(svgs).toBeGreaterThanOrEqual(1);
  94  |   });
  95  | 
  96  |   test('EN page renders Mermaid SVGs', async ({ page }) => {
> 97  |     await page.goto(`${DOCS}/en/guide/architecture/`);
      |                ^ Error: page.goto: net::ERR_NETWORK_CHANGED at https://jeanbaptiste.github.io/webmcp-auto-ui/en/guide/architecture/
  98  |     await page.waitForTimeout(3000);
  99  |     const svgs = await page.locator('svg[id^="mermaid"]').count();
  100 |     expect(svgs).toBeGreaterThanOrEqual(1);
  101 |   });
  102 | });
  103 | 
  104 | // ���── TUTORIALS ────────────────────────────────────────────────────────────
  105 | 
  106 | test.describe('Docs — Tutorials', () => {
  107 |   test('custom widget tutorial loads (FR)', async ({ page }) => {
  108 |     await page.goto(`${DOCS}/tutorials/create-custom-widget/`);
  109 |     await expect(page.locator('h1')).toBeVisible();
  110 |     const content = await page.textContent('body');
  111 |     expect(content).toContain('widget');
  112 |   });
  113 | 
  114 |   test('use existing widgets tutorial loads (FR)', async ({ page }) => {
  115 |     await page.goto(`${DOCS}/tutorials/use-existing-widgets/`);
  116 |     await expect(page.locator('h1')).toBeVisible();
  117 |   });
  118 | 
  119 |   test('connect MCP server tutorial loads (FR)', async ({ page }) => {
  120 |     await page.goto(`${DOCS}/tutorials/connect-mcp-server/`);
  121 |     await expect(page.locator('h1')).toBeVisible();
  122 |   });
  123 | 
  124 |   test('no obsolete model names in tutorials', async ({ page }) => {
  125 |     await page.goto(`${DOCS}/tutorials/connect-mcp-server/`);
  126 |     const content = await page.textContent('body');
  127 |     expect(content).not.toContain('claude-3-5-sonnet-20241022');
  128 |   });
  129 | });
  130 | 
  131 | // ─── INDEX / NAVIGATION ───────────────────────────────────────────────────
  132 | 
  133 | test.describe('Docs — Index', () => {
  134 |   test('FR index loads', async ({ page }) => {
  135 |     await page.goto(`${DOCS}/`);
  136 |     await expect(page.locator('h1')).toBeVisible();
  137 |   });
  138 | 
  139 |   test('EN index loads', async ({ page }) => {
  140 |     await page.goto(`${DOCS}/en/`);
  141 |     await expect(page.locator('h1')).toBeVisible();
  142 |   });
  143 | 
  144 |   test('FR index has relative links', async ({ page }) => {
  145 |     await page.goto(`${DOCS}/`);
  146 |     const absoluteLinks = await page.locator('a[href^="/guide/"]').count();
  147 |     expect(absoluteLinks).toBe(0);
  148 |   });
  149 | 
  150 |   test('all doc pages return 200', async ({ request }) => {
  151 |     const pages = [
  152 |       '/', '/en/',
  153 |       '/guide/getting-started/', '/guide/architecture/', '/guide/tool-calling/', '/guide/deploy/',
  154 |       '/en/guide/getting-started/', '/en/guide/architecture/', '/en/guide/tool-calling/', '/en/guide/deploy/',
  155 |       '/packages/agent/', '/packages/ui/', '/packages/core/', '/packages/sdk/',
  156 |       '/tutorials/create-custom-widget/', '/tutorials/use-existing-widgets/', '/tutorials/connect-mcp-server/',
  157 |     ];
  158 |     for (const p of pages) {
  159 |       const res = await request.get(`${DOCS}${p}`);
  160 |       expect(res.status(), `${p} should be 200`).toBe(200);
  161 |     }
  162 |   });
  163 | });
  164 | 
```