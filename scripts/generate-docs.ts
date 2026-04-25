/**
 * generate-docs.ts
 *
 * Generates Starlight documentation from source code using Claude API.
 * The documentation is DERIVED from code — never maintained by hand.
 *
 * Usage:
 *   npx tsx scripts/generate-docs.ts            # full generation
 *   npx tsx scripts/generate-docs.ts --dry-run   # list files without calling API
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = join(new URL('.', import.meta.url).pathname, '..');
const DOCS_FR = join(ROOT, 'docs/starlight/src/content/docs');  // root locale = FR
const DOCS_EN = join(ROOT, 'docs/starlight/src/content/docs/en');
const DRY_RUN = process.argv.includes('--dry-run');
const MODEL = 'claude-haiku-4-5-20251001';

/** Source files to feed Claude as context */
const SOURCE_FILES = [
  'packages/agent/src/loop.ts',
  'packages/agent/src/tool-layers.ts',
  'packages/agent/src/autoui-server.ts',
  'packages/agent/src/types.ts',
  'packages/agent/src/index.ts',
  'packages/core/src/webmcp-server.ts',
  'packages/core/src/types.ts',
  'packages/core/src/index.ts',
  'packages/ui/src/widgets/WidgetRenderer.svelte',
  'packages/ui/src/widgets/SafeImage.svelte',
  'packages/ui/src/widgets/LinkOverlay.svelte',
  'packages/ui/src/messaging/bus.svelte.ts',
  'packages/ui/src/index.ts',
  'packages/sdk/src/stores/canvas.svelte.ts',
  'packages/sdk/src/stores/canvas.ts',
  'packages/sdk/src/index.ts',
  'CLAUDE.md',
];

/** All output files that will be generated */
const OUTPUT_FILES = {
  fr: [
    'index.mdx',
    'guide/getting-started.mdx',
    'guide/architecture.mdx',
    'guide/tool-calling.mdx',
    'guide/deploy.mdx',
    'packages/agent.mdx',
    'packages/ui.mdx',
    'packages/sdk.mdx',
    'packages/core.mdx',
    'tutorials/create-custom-widget.mdx',
    'tutorials/use-existing-widgets.mdx',
    'tutorials/connect-mcp-server.mdx',
  ],
  en: [
    'index.mdx',
    'guide/getting-started.mdx',
    'guide/architecture.mdx',
    'guide/tool-calling.mdx',
    'guide/deploy.mdx',
    'packages/agent.mdx',
    'packages/ui.mdx',
    'packages/sdk.mdx',
    'packages/core.mdx',
    'tutorials/create-custom-widget.mdx',
    'tutorials/use-existing-widgets.mdx',
    'tutorials/connect-mcp-server.mdx',
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSources(): string {
  const parts: string[] = [];
  for (const f of SOURCE_FILES) {
    const abs = join(ROOT, f);
    try {
      const content = readFileSync(abs, 'utf-8');
      parts.push(`### ${f}\n\`\`\`ts\n${content}\n\`\`\``);
    } catch {
      // file may not exist — skip silently
    }
  }
  return parts.join('\n\n');
}

function writeDoc(base: string, relativePath: string, content: string) {
  const abs = join(base, relativePath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf-8');
  console.log(`  wrote ${relativePath}`);
}

/**
 * Normalize a raw file path from Claude's response to match an expected OUTPUT_FILES entry.
 * Claude sometimes returns paths like "docs/packages/agent.mdx" or
 * "src/content/docs/guide/architecture.mdx" instead of "guide/architecture.mdx".
 */
function normalizeFilePath(rawPath: string, expectedPaths: string[]): string | null {
  // 1. Direct match
  if (expectedPaths.includes(rawPath)) return rawPath;

  // 2. Strip common prefixes Claude may prepend
  const prefixes = [
    'docs/',
    'en/',
    'src/content/docs/',
    'src/content/docs/en/',
    'docs/starlight/src/content/docs/',
    'docs/starlight/src/content/docs/en/',
  ];
  for (const prefix of prefixes) {
    if (rawPath.startsWith(prefix)) {
      const stripped = rawPath.slice(prefix.length);
      if (expectedPaths.includes(stripped)) return stripped;
    }
  }

  // 3. Match by parent-dir + basename (last two segments)
  const parts = rawPath.split('/');
  const basename = parts[parts.length - 1];
  if (parts.length >= 2) {
    const parentAndBase = parts.slice(-2).join('/');
    if (expectedPaths.includes(parentAndBase)) return parentAndBase;
  }

  // 4. Match by basename alone
  for (const ep of expectedPaths) {
    if (ep.endsWith('/' + basename) || ep === basename) return ep;
  }

  return null;
}

/** Parse Claude response that contains multiple files delimited by markers */
function parseFiles(response: string, expectedPaths?: string[]): Record<string, string> {
  const files: Record<string, string> = {};
  // Expected format: === FILE: path/to/file.mdx ===\n<content>\n=== END FILE ===
  const regex = /=== FILE: (.+?) ===\n([\s\S]*?)(?==== END FILE ===|=== FILE:|$)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(response)) !== null) {
    const rawPath = match[1].trim();
    const content = match[2].trimEnd() + '\n';

    if (expectedPaths) {
      const normalized = normalizeFilePath(rawPath, expectedPaths);
      if (normalized) {
        if (normalized !== rawPath) {
          console.log(`    normalized "${rawPath}" → "${normalized}"`);
        }
        files[normalized] = content;
      } else {
        console.warn(`    WARNING: could not match "${rawPath}" to any expected file, writing as-is`);
        files[rawPath] = content;
      }
    } else {
      files[rawPath] = content;
    }
  }
  return files;
}

async function callClaude(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  label: string,
): Promise<string> {
  console.log(`\n  [${label}] Calling Claude (${MODEL})...`);
  const start = Date.now();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const tokens = response.usage;
  console.log(
    `  [${label}] Done in ${elapsed}s (input: ${tokens.input_tokens}, output: ${tokens.output_tokens})`,
  );
  return text;
}

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert technical documentation writer. You generate .mdx files for Starlight (Astro).

Rules:
- Each file starts with YAML frontmatter containing: title, description, sidebar (with order)
- Architecture diagrams use \`\`\`mermaid blocks
- Code examples are concrete, extracted from or inspired by the real code provided
- The tone is technical but accessible
- You use the multi-file output format:
  === FILE: relative/path.mdx ===
  <file content>
  === END FILE ===
- Generate NOTHING outside this format (no comments before/after)`;

function promptOverviewAndGuide(sources: string): string {
  return `Here is the source code of the WebMCP Auto-UI project:

${sources}

Generate the following files in FRENCH:

1. **index.mdx** — Home page: overview of the WebMCP Auto-UI project (UI auto-generation system by AI agents via MCP). Sidebar order: 0.

2. **guide/getting-started.mdx** — Quickstart for a developer: installation, configuration, first launch. Sidebar order: 1.

3. **guide/architecture.mdx** — Complete system architecture: MCP, agent loop, tool layers, component registry, canvas. Include at least 2 Mermaid diagrams (one for the overall architecture, one for the agent flow). Sidebar order: 2.

4. **guide/tool-calling.mdx** — How tool calling works: tool layers, component tool, UI tools, skill executor. Sidebar order: 3.

5. **guide/deploy.mdx** — How to deploy apps (using scripts/deploy.sh, paths per app, constraints). Sidebar order: 4.

Use the === FILE: ... === format for each file.`;
}

function promptPackages(sources: string): string {
  return `Here is the source code of the WebMCP Auto-UI project:

${sources}

Generate the following files in FRENCH — API reference documentation for each package:

1. **packages/agent.mdx** — Package @webmcp-auto-ui/agent: agent loop (runAgentLoop), providers (Anthropic, Gemma WASM), tool layers, component tool, skill executor, token tracker. List all public exports with their signature and a description. Sidebar order: 1.

2. **packages/ui.mdx** — Package @webmcp-auto-ui/ui: BlockRenderer, LLMSelector, GemmaLoader, McpStatus, AgentProgress. Show how to use each Svelte component with examples. Sidebar order: 2.

3. **packages/sdk.mdx** — Package @webmcp-auto-ui/sdk: canvas store, HyperSkill encode/decode/hash/diff/getHsParam. Detail the canvas store API and utility functions. Sidebar order: 3.

4. **packages/core.mdx** — Package @webmcp-auto-ui/core: McpClient, createToolGroup, types, events. Detail the MCP client API and helpers. Sidebar order: 4.

Use the === FILE: ... === format for each file.`;
}

function promptTutorials(sources: string): string {
  return `Here is the source code of the WebMCP Auto-UI project:

${sources}

Generate the following files in FRENCH — step-by-step tutorials:

1. **tutorials/create-custom-widget.mdx** — Tutorial: create a custom widget for the component system. Show how to register a new component in the registry, render it via BlockRenderer, and connect it to the canvas. Sidebar order: 1.

2. **tutorials/use-existing-widgets.mdx** — Tutorial: use existing widgets (BlockRenderer with simple and rich block types). Show concrete usage examples in a Svelte app. Sidebar order: 2.

3. **tutorials/connect-mcp-server.mdx** — Tutorial: connect an external MCP server. Show how to use McpClient, configure tool groups, and integrate with the agent loop. Sidebar order: 3.

Use the === FILE: ... === format for each file.`;
}

function promptTranslate(frenchDocs: Record<string, string>): string {
  const docsList = Object.entries(frenchDocs)
    .map(([path, content]) => `=== FILE: ${path} ===\n${content}\n=== END FILE ===`)
    .join('\n\n');

  return `Translate these technical documentation files from French to English.
Preserve exactly:
- The YAML frontmatter (translate title and description)
- The Markdown/MDX structure
- Code blocks (do NOT translate the code, only the comments)
- Mermaid diagrams (translate the labels)
- The === FILE: ... === output format

Here are the files:

${docsList}

Generate the translated files with the same relative paths.`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('WebMCP Auto-UI — Documentation Generator\n');

  // Dry-run mode
  if (DRY_RUN) {
    console.log('DRY RUN — files that would be generated:\n');
    for (const [locale, files] of Object.entries(OUTPUT_FILES)) {
      const base = locale === 'fr' ? DOCS_FR : DOCS_EN;
      for (const f of files) {
        console.log(`  ${join(base, f)}`);
      }
    }
    console.log(`\nTotal: ${OUTPUT_FILES.fr.length + OUTPUT_FILES.en.length} files`);
    console.log('Source files that would be read:');
    for (const f of SOURCE_FILES) {
      const exists = existsSync(join(ROOT, f));
      console.log(`  ${exists ? '✓' : '✗'} ${f}`);
    }
    return;
  }

  // Check API key — skip gracefully in CI if not set
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      'WARNING: ANTHROPIC_API_KEY not set — skipping doc generation.\n' +
        'Set it before running: export ANTHROPIC_API_KEY=sk-ant-...\n' +
        'Or use --dry-run to preview without calling the API.\n' +
        'The Starlight site will build with existing docs.',
    );
    return;
  }

  const client = new Anthropic({ timeout: 600_000 });
  const sources = readSources();
  console.log(`Read ${SOURCE_FILES.length} source files as context.`);

  // Clean existing generated docs (both .md and .mdx)
  for (const dir of [DOCS_FR, DOCS_EN]) {
    for (const sub of ['guide', 'packages', 'tutorials']) {
      const target = join(dir, sub);
      if (existsSync(target)) {
        rmSync(target, { recursive: true });
        console.log(`  cleaned ${target}`);
      }
    }
    // Remove old index files
    for (const ext of ['mdx', 'md']) {
      const idx = join(dir, `index.${ext}`);
      if (existsSync(idx)) {
        rmSync(idx);
        console.log(`  cleaned ${idx}`);
      }
    }
  }

  // --- Batch 1: Overview + Guide ---
  console.log('\n--- Batch 1: Overview & Guide (FR) ---');
  const guideRaw = await callClaude(
    client,
    SYSTEM_PROMPT,
    promptOverviewAndGuide(sources),
    'guide',
  );
  const guideFiles = parseFiles(guideRaw, OUTPUT_FILES.fr);

  // --- Batch 2: Packages ---
  console.log('\n--- Batch 2: Packages API Reference (FR) ---');
  const pkgRaw = await callClaude(client, SYSTEM_PROMPT, promptPackages(sources), 'packages');
  const pkgFiles = parseFiles(pkgRaw, OUTPUT_FILES.fr);

  // --- Batch 3: Tutorials ---
  console.log('\n--- Batch 3: Tutorials (FR) ---');
  const tutRaw = await callClaude(client, SYSTEM_PROMPT, promptTutorials(sources), 'tutorials');
  const tutFiles = parseFiles(tutRaw, OUTPUT_FILES.fr);

  // Merge all FR files
  const allFrFiles: Record<string, string> = { ...guideFiles, ...pkgFiles, ...tutFiles };

  // Write FR files
  console.log('\n--- Writing FR docs ---');
  for (const [path, content] of Object.entries(allFrFiles)) {
    writeDoc(DOCS_FR, path, content);
  }

  // --- Batch 4: Translate to English ---
  console.log('\n--- Batch 4: Translation to English ---');
  const enRaw = await callClaude(
    client,
    SYSTEM_PROMPT,
    promptTranslate(allFrFiles),
    'translate',
  );
  const enFiles = parseFiles(enRaw, OUTPUT_FILES.en);

  // Write EN files
  console.log('\n--- Writing EN docs ---');
  for (const [path, content] of Object.entries(enFiles)) {
    writeDoc(DOCS_EN, path, content);
  }

  // Summary
  const frCount = Object.keys(allFrFiles).length;
  const enCount = Object.keys(enFiles).length;
  console.log(`\nDone! Generated ${frCount} FR + ${enCount} EN = ${frCount + enCount} files.`);
}

main().catch((err) => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
