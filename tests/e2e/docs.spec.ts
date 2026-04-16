import { test, expect } from '@playwright/test';

const DOCS = 'https://jeanbaptiste.github.io/webmcp-auto-ui';

// ─── GETTING STARTED (FR) ─────────────────────────────────────────────────

test.describe('Docs — Getting Started FR', () => {
  test('page loads', async ({ page }) => {
    await page.goto(`${DOCS}/guide/getting-started/`);
    await expect(page.locator('h1')).toContainText('getting started', { ignoreCase: true });
  });

  test('boilerplate degit command is present', async ({ page }) => {
    await page.goto(`${DOCS}/guide/getting-started/`);
    const content = await page.textContent('body');
    expect(content).toContain('npx degit');
    expect(content).toContain('boilerplate');
  });

  test('uses npm not pnpm', async ({ page }) => {
    await page.goto(`${DOCS}/guide/getting-started/`);
    const content = await page.textContent('body');
    expect(content).toContain('npm install');
    expect(content).not.toContain('pnpm install');
  });

  test('uses proxyUrl not apiKey', async ({ page }) => {
    await page.goto(`${DOCS}/guide/getting-started/`);
    const content = await page.textContent('body');
    expect(content).toContain('proxyUrl');
    expect(content).not.toContain("model: 'claude-3-5-sonnet");
  });

  test('lists current apps (flex, showcase)', async ({ page }) => {
    await page.goto(`${DOCS}/guide/getting-started/`);
    const content = await page.textContent('body');
    expect(content).toContain('flex/');
    expect(content).toContain('showcase/');
    expect(content).toContain('todo/');
    expect(content).toContain('viewer/');
  });

  test('has Tricoteuses tutorial link', async ({ page }) => {
    await page.goto(`${DOCS}/guide/getting-started/`);
    const link = page.locator('a[href*="create-custom-widget"]');
    await expect(link).toBeVisible();
  });

  test('internal links are relative (no absolute /guide/)', async ({ page }) => {
    await page.goto(`${DOCS}/guide/getting-started/`);
    const absoluteLinks = await page.locator('a[href^="/guide/"]').count();
    expect(absoluteLinks).toBe(0);
  });
});

// ─── GETTING STARTED (EN) ─────────────────────────────────────────────────

test.describe('Docs — Getting Started EN', () => {
  test('page loads', async ({ page }) => {
    await page.goto(`${DOCS}/en/guide/getting-started/`);
    await expect(page.locator('h1')).toContainText('Getting Started');
  });

  test('boilerplate degit command is present', async ({ page }) => {
    await page.goto(`${DOCS}/en/guide/getting-started/`);
    const content = await page.textContent('body');
    expect(content).toContain('npx degit');
    expect(content).toContain('boilerplate');
  });

  test('uses proxyUrl not apiKey', async ({ page }) => {
    await page.goto(`${DOCS}/en/guide/getting-started/`);
    const content = await page.textContent('body');
    expect(content).toContain('proxyUrl');
    expect(content).not.toContain("model: 'claude-3-5-sonnet");
  });

  test('has Tricoteuses tutorial link', async ({ page }) => {
    await page.goto(`${DOCS}/en/guide/getting-started/`);
    const link = page.locator('a[href*="create-custom-widget"]');
    await expect(link).toBeVisible();
  });
});

// ─── ARCHITECTURE — MERMAID SVG ───────────────────────────────────────────

test.describe('Docs — Architecture Mermaid', () => {
  test('FR page renders Mermaid SVGs', async ({ page }) => {
    await page.goto(`${DOCS}/guide/architecture/`);
    // Mermaid renders into SVG elements
    await page.waitForTimeout(3000);
    const svgs = await page.locator('svg[id^="mermaid"]').count();
    expect(svgs).toBeGreaterThanOrEqual(1);
  });

  test('EN page renders Mermaid SVGs', async ({ page }) => {
    await page.goto(`${DOCS}/en/guide/architecture/`);
    await page.waitForTimeout(3000);
    const svgs = await page.locator('svg[id^="mermaid"]').count();
    expect(svgs).toBeGreaterThanOrEqual(1);
  });
});

// ���── TUTORIALS ────────────────────────────────────────────────────────────

test.describe('Docs — Tutorials', () => {
  test('custom widget tutorial loads (FR)', async ({ page }) => {
    await page.goto(`${DOCS}/tutorials/create-custom-widget/`);
    await expect(page.locator('h1')).toBeVisible();
    const content = await page.textContent('body');
    expect(content).toContain('widget');
  });

  test('use existing widgets tutorial loads (FR)', async ({ page }) => {
    await page.goto(`${DOCS}/tutorials/use-existing-widgets/`);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('connect MCP server tutorial loads (FR)', async ({ page }) => {
    await page.goto(`${DOCS}/tutorials/connect-mcp-server/`);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('no obsolete model names in tutorials', async ({ page }) => {
    await page.goto(`${DOCS}/tutorials/connect-mcp-server/`);
    const content = await page.textContent('body');
    expect(content).not.toContain('claude-3-5-sonnet-20241022');
  });
});

// ─── INDEX / NAVIGATION ───────────────────────────────────────────────────

test.describe('Docs — Index', () => {
  test('FR index loads', async ({ page }) => {
    await page.goto(`${DOCS}/`);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('EN index loads', async ({ page }) => {
    await page.goto(`${DOCS}/en/`);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('FR index has relative links', async ({ page }) => {
    await page.goto(`${DOCS}/`);
    const absoluteLinks = await page.locator('a[href^="/guide/"]').count();
    expect(absoluteLinks).toBe(0);
  });

  test('all doc pages return 200', async ({ request }) => {
    const pages = [
      '/', '/en/',
      '/guide/getting-started/', '/guide/architecture/', '/guide/tool-calling/', '/guide/deploy/',
      '/en/guide/getting-started/', '/en/guide/architecture/', '/en/guide/tool-calling/', '/en/guide/deploy/',
      '/packages/agent/', '/packages/ui/', '/packages/core/', '/packages/sdk/',
      '/tutorials/create-custom-widget/', '/tutorials/use-existing-widgets/', '/tutorials/connect-mcp-server/',
    ];
    for (const p of pages) {
      const res = await request.get(`${DOCS}${p}`);
      expect(res.status(), `${p} should be 200`).toBe(200);
    }
  });
});
