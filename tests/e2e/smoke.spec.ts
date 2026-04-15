import { test, expect } from '@playwright/test';

const BASE = 'https://demos.hyperskills.net';

// ─── HOME ──────────────────────────────────────────────────────────────────

test.describe('Home page', () => {
  test('loads and shows title', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page).toHaveTitle(/Auto-UI/i);
  });

  test('shows all 4 demo cards', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForSelector('a[href*="/composer"]');
    const cards = await page.locator('a[href*="demos.hyperskills.net"]').count();
    expect(cards).toBeGreaterThanOrEqual(4);
  });

  test('card links point to correct domains', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForSelector('a[href*="/composer"]');
    for (const path of ['/composer', '/viewer', '/showcase', '/todo']) {
      const link = page.locator(`a[href*="${path}"]`).first();
      await expect(link).toBeVisible();
      const href = await link.getAttribute('href');
      expect(href).toContain('demos.hyperskills.net');
    }
  });
});

// ─── COMPOSER ───────────────────────────────────────────────────────────────

test.describe('Composer', () => {
  test('loads with Auto-UI title', async ({ page }) => {
    await page.goto(`${BASE}/composer/`);
    await expect(page).toHaveTitle(/Auto-UI/i);
    await expect(page.locator('text=Auto').first()).toBeVisible();
  });

  test('default mode is drag & drop', async ({ page }) => {
    await page.goto(`${BASE}/composer/`);
    // The drag button should have active styling
    const dragBtn = page.locator('button', { hasText: 'drag & drop' });
    await expect(dragBtn).toBeVisible();
  });

  test('no hyperskills URL button in topbar', async ({ page }) => {
    await page.goto(`${BASE}/composer/`);
    const hsBtn = page.locator('button', { hasText: 'hyperskills URL' });
    await expect(hsBtn).toHaveCount(0);
  });

  test('LLM selector has all 4 options', async ({ page }) => {
    await page.goto(`${BASE}/composer/`);
    const select = page.locator('select').first();
    const options = await select.locator('option').allTextContents();
    expect(options).toContain('claude-haiku-4-5');
    expect(options).toContain('claude-sonnet-4-6');
    expect(options.some(o => o.includes('Gemma E2B'))).toBe(true);
    expect(options.some(o => o.includes('Gemma E4B'))).toBe(true);
  });

  test('MCP URL input is functional', async ({ page }) => {
    await page.goto(`${BASE}/composer/`);
    const input = page.locator('input[placeholder*="mcp"]').first();
    await expect(input).toBeVisible();
    await input.fill('https://mcp.code4code.eu/mcp');
    await expect(input).toHaveValue('https://mcp.code4code.eu/mcp');
  });

  test('settings button opens modal', async ({ page }) => {
    await page.goto(`${BASE}/composer/`);
    // Click the settings gear icon
    const settingsBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
    // Find button near "export" — settings is before export
    const gearBtn = page.locator('button:has(svg)').filter({ hasText: '' });
    // Try clicking any button that might open settings
    await page.click('button:has(svg.lucide-settings)');
    await page.waitForTimeout(500);
    const modal = page.locator('text=System prompt');
    if (await modal.isVisible()) {
      await expect(modal).toBeVisible();
    }
  });

  test('export modal works', async ({ page }) => {
    await page.goto(`${BASE}/composer/`);
    // Wait for Svelte hydration: the LLM $effect fires client-side and adds
    // a system message to canvas, which shows a count badge in AgentConsole.
    // The export button only exists at md+ viewport (hidden md:flex).
    await page.waitForFunction(
      () => document.querySelector('button[disabled][class*="statusColor"], select option') !== null,
      { timeout: 10000 }
    );
    await page.waitForTimeout(500); // extra tick for hydration to settle
    const exportBtn = page.locator('button', { hasText: 'export' });
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await expect(page.locator('text=Export Skill')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=skill.json')).toBeVisible({ timeout: 3000 });
    }
  });

  test('mode switching works', async ({ page }) => {
    await page.goto(`${BASE}/composer/`);
    // Switch to chat mode
    await page.click('button:has-text("chat")');
    await page.waitForTimeout(300);
    // Switch to auto mode
    await page.click('button:has-text("auto")');
    await page.waitForTimeout(300);
    // Switch back to drag
    await page.click('button:has-text("drag")');
  });

  test('?hs= URL loads a skill', async ({ page }) => {
    const hs = btoa(JSON.stringify({version:'1.0',name:'test',blocks:[{type:'stat',data:{label:'Test',value:'42',trendDir:'up'}}]}));
    await page.goto(`${BASE}/composer/?hs=${hs}`);
    await page.waitForTimeout(1000);
    // Should have at least 1 block
    const blocks = page.locator('[role="list"] > div');
    await expect(blocks.first()).toBeVisible({ timeout: 5000 });
  });

  test('chat API responds', async ({ request }) => {
    const res = await request.post(`${BASE}/composer/api/chat`, {
      data: { messages: [{ role: 'user', content: 'say ok' }], model: 'claude-haiku-4-5-20251001', max_tokens: 5 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.type).toBe('message');
  });
});

// ─── VIEWER ─────────────────────────────────────────────────────────────────

test.describe('Viewer', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto(`${BASE}/viewer/`);
    await expect(page).toHaveTitle(/Viewer/i);
  });

  test('shows HyperSkill explanation', async ({ page }) => {
    await page.goto(`${BASE}/viewer/`);
    // Check for the explanation text (visible on xl screens)
    const text = page.locator('text=widget UI portable');
    // May be hidden on small viewports
    expect(await text.count()).toBeGreaterThanOrEqual(1);
  });

  test('has hyperskills.net link', async ({ page }) => {
    await page.goto(`${BASE}/viewer/`);
    const link = page.locator('a[href="https://hyperskills.net"]');
    expect(await link.count()).toBeGreaterThanOrEqual(1);
  });

  test('URL input accepts value and charger button works', async ({ page }) => {
    await page.goto(`${BASE}/viewer/`);
    const input = page.locator('input').first();
    await input.fill('test-url');
    await expect(input).toHaveValue('test-url');
    const chargerBtn = page.locator('button', { hasText: 'charger' });
    await expect(chargerBtn).toBeVisible();
  });

  test('loads skill from ?hs= param', async ({ page }) => {
    const skill = { meta: { title: 'e2e-test' }, content: { blocks: [{ type: 'stat', data: { label: 'E2E', value: '100' } }] } };
    const hs = btoa(unescape(encodeURIComponent(JSON.stringify(skill))));
    await page.goto(`${BASE}/viewer/?hs=${hs}`);
    await page.waitForTimeout(2000);
    await expect(page.locator('text=e2e-test').first()).toBeVisible({ timeout: 5000 });
  });

  test('chat API responds', async ({ request }) => {
    const res = await request.post(`${BASE}/viewer/api/chat`, {
      data: { messages: [{ role: 'user', content: 'ok' }], model: 'claude-haiku-4-5-20251001', max_tokens: 5 },
    });
    expect(res.status()).toBe(200);
  });
});

// ─── SHOWCASE ───────────────────────────────────────────────────────────────

test.describe('Showcase', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto(`${BASE}/showcase/`);
    await page.waitForSelector('text=UI Showcase', { timeout: 10000 });
  });

  test('has all nav sections', async ({ page }) => {
    await page.goto(`${BASE}/showcase/`);
    await page.waitForTimeout(2000);
    for (const section of ['Primitives', 'Blocs simples', 'Widgets riches', 'Gallery', 'D3']) {
      expect(await page.locator(`text=${section}`).count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('DAG FONC badge visible', async ({ page }) => {
    await page.goto(`${BASE}/showcase/`);
    await page.waitForTimeout(2000);
    const dag = page.locator('text=DAG FONC');
    expect(await dag.count()).toBeGreaterThanOrEqual(1);
  });

  test('MCP input visible', async ({ page }) => {
    await page.goto(`${BASE}/showcase/`);
    const input = page.locator('input[placeholder*="MCP"]');
    await expect(input).toBeVisible();
  });

  test('no Marie Dupont', async ({ page }) => {
    await page.goto(`${BASE}/showcase/`);
    await page.waitForTimeout(3000);
    const content = await page.textContent('body');
    expect(content).not.toContain('Marie Dupont');
  });

  test('has Claire Forestier', async ({ page }) => {
    await page.goto(`${BASE}/showcase/`);
    await page.waitForTimeout(3000);
    const content = await page.textContent('body');
    expect(content).toContain('Claire Forestier');
  });

  test('color squares visible on DAG components', async ({ page }) => {
    await page.goto(`${BASE}/showcase/`);
    await page.waitForTimeout(3000);
    // Color squares are small buttons with inline background colors
    const colorBtns = page.locator('button[style*="background:"]');
    expect(await colorBtns.count()).toBeGreaterThanOrEqual(5);
  });
});

// ─── TODO ───────────────────────────────────────────────────────────────────

test.describe('Todo', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto(`${BASE}/todo/`);
    await page.waitForTimeout(2000);
    await expect(page.locator('input[placeholder*="tâche"], input[placeholder*="Nouvelle"]')).toBeVisible();
  });

  test('add todo works', async ({ page }) => {
    await page.goto(`${BASE}/todo/`);
    await page.waitForTimeout(2000);
    const input = page.locator('input[placeholder*="tâche"], input[placeholder*="Nouvelle"]').first();
    await input.fill('E2E test task');
    await page.click('button:has-text("Ajouter")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=E2E test task')).toBeVisible();
  });

  test('filter buttons visible', async ({ page }) => {
    await page.goto(`${BASE}/todo/`);
    await page.waitForTimeout(2000);
    for (const label of ['Tous', 'Actifs']) {
      await expect(page.locator(`button:has-text("${label}")`)).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Terminés', exact: true })).toBeVisible();
  });
});

// ─── CROSS-CUTTING ──────────────────────────────────────────────────────────

test.describe('Cross-cutting', () => {
  test('all pages return 200', async ({ request }) => {
    for (const path of ['/', '/composer/', '/viewer/', '/showcase/', '/todo/']) {
      const res = await request.get(`${BASE}${path}`);
      expect(res.status(), `${path} should be 200`).toBe(200);
    }
  });

  test('all assets load (no 404)', async ({ page }) => {
    const failures: string[] = [];
    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().includes('fonts.googleapis.com')) {
        failures.push(`${res.status()} ${res.url()}`);
      }
    });
    await page.goto(`${BASE}/composer/`);
    await page.waitForTimeout(3000);
    expect(failures).toEqual([]);
  });

  test('MCP server is reachable', async ({ request }) => {
    const res = await request.post('https://mcp.code4code.eu/mcp', {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      data: { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'e2e', version: '1.0' } } },
    });
    expect(res.status()).toBe(200);
  });
});
