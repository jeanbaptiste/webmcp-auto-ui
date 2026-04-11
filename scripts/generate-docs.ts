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
const DOCS_FR = join(ROOT, 'docs-site/src/content/docs/fr');
const DOCS_EN = join(ROOT, 'docs-site/src/content/docs/en');
const DRY_RUN = process.argv.includes('--dry-run');
const MODEL = 'claude-sonnet-4-20250514';

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

/** Parse Claude response that contains multiple files delimited by markers */
function parseFiles(response: string): Record<string, string> {
  const files: Record<string, string> = {};
  // Expected format: === FILE: path/to/file.mdx ===\n<content>\n=== END FILE ===
  const regex = /=== FILE: (.+?) ===\n([\s\S]*?)(?==== END FILE ===|=== FILE:|$)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(response)) !== null) {
    const path = match[1].trim();
    const content = match[2].trimEnd() + '\n';
    files[path] = content;
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

const SYSTEM_PROMPT = `Tu es un rédacteur de documentation technique expert. Tu génères des fichiers .mdx pour Starlight (Astro).

Règles :
- Chaque fichier commence par un frontmatter YAML avec : title, description, sidebar (avec order)
- Les diagrammes d'architecture utilisent des blocs \`\`\`mermaid
- Les exemples de code sont concrets, extraits ou inspirés du code réel fourni
- Le ton est technique mais accessible
- Tu utilises le format de sortie multi-fichiers :
  === FILE: chemin/relatif.mdx ===
  <contenu du fichier>
  === END FILE ===
- Ne génère RIEN en dehors de ce format (pas de commentaire avant/après)`;

function promptOverviewAndGuide(sources: string): string {
  return `Voici le code source du projet WebMCP Auto-UI :

${sources}

Génère les fichiers suivants en FRANÇAIS :

1. **index.mdx** — Page d'accueil : overview du projet WebMCP Auto-UI (système d'auto-génération d'UI par agents IA via MCP). Sidebar order: 0.

2. **guide/getting-started.mdx** — Quickstart pour un développeur : installation, configuration, premier lancement. Sidebar order: 1.

3. **guide/architecture.mdx** — Architecture complète du système : MCP, agent loop, tool layers, component registry, canvas. Inclure au moins 2 diagrammes Mermaid (un pour l'architecture globale, un pour le flow agent). Sidebar order: 2.

4. **guide/tool-calling.mdx** — Comment fonctionne le tool calling : tool layers, component tool, UI tools, skill executor. Sidebar order: 3.

5. **guide/deploy.mdx** — Comment déployer les apps (utilisation de scripts/deploy.sh, chemins par app, contraintes). Sidebar order: 4.

Utilise le format === FILE: ... === pour chaque fichier.`;
}

function promptPackages(sources: string): string {
  return `Voici le code source du projet WebMCP Auto-UI :

${sources}

Génère les fichiers suivants en FRANÇAIS — documentation API de référence pour chaque package :

1. **packages/agent.mdx** — Package @webmcp-auto-ui/agent : agent loop (runAgentLoop), providers (Anthropic, Gemma WASM), tool layers, component tool, skill executor, token tracker. Liste tous les exports publics avec leur signature et une description. Sidebar order: 1.

2. **packages/ui.mdx** — Package @webmcp-auto-ui/ui : BlockRenderer, LLMSelector, GemmaLoader, McpStatus, AgentProgress. Montre comment utiliser chaque composant Svelte avec des exemples. Sidebar order: 2.

3. **packages/sdk.mdx** — Package @webmcp-auto-ui/sdk : canvas store, HyperSkill encode/decode/hash/diff/getHsParam. Détaille l'API du store canvas et les fonctions utilitaires. Sidebar order: 3.

4. **packages/core.mdx** — Package @webmcp-auto-ui/core : McpClient, createToolGroup, types, events. Détaille l'API client MCP et les helpers. Sidebar order: 4.

Utilise le format === FILE: ... === pour chaque fichier.`;
}

function promptTutorials(sources: string): string {
  return `Voici le code source du projet WebMCP Auto-UI :

${sources}

Génère les fichiers suivants en FRANÇAIS — tutorials pas-à-pas :

1. **tutorials/create-custom-widget.mdx** — Tutorial : créer un widget custom pour le système de composants. Montre comment enregistrer un nouveau composant dans le registry, le rendre via BlockRenderer, et le connecter au canvas. Sidebar order: 1.

2. **tutorials/use-existing-widgets.mdx** — Tutorial : utiliser les widgets existants (BlockRenderer avec les types de blocs simple et rich). Montre des exemples concrets d'utilisation dans une app Svelte. Sidebar order: 2.

3. **tutorials/connect-mcp-server.mdx** — Tutorial : connecter un serveur MCP externe. Montre comment utiliser McpClient, configurer les tool groups, et intégrer avec l'agent loop. Sidebar order: 3.

Utilise le format === FILE: ... === pour chaque fichier.`;
}

function promptTranslate(frenchDocs: Record<string, string>): string {
  const docsList = Object.entries(frenchDocs)
    .map(([path, content]) => `=== FILE: ${path} ===\n${content}\n=== END FILE ===`)
    .join('\n\n');

  return `Traduis ces fichiers de documentation technique du français vers l'anglais.
Conserve exactement :
- Le frontmatter YAML (traduis title et description)
- La structure Markdown/MDX
- Les blocs de code (ne traduis PAS le code, seulement les commentaires)
- Les diagrammes Mermaid (traduis les labels)
- Le format de sortie === FILE: ... ===

Voici les fichiers :

${docsList}

Génère les fichiers traduits avec les mêmes chemins relatifs.`;
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

  const client = new Anthropic();
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
  const guideFiles = parseFiles(guideRaw);

  // --- Batch 2: Packages ---
  console.log('\n--- Batch 2: Packages API Reference (FR) ---');
  const pkgRaw = await callClaude(client, SYSTEM_PROMPT, promptPackages(sources), 'packages');
  const pkgFiles = parseFiles(pkgRaw);

  // --- Batch 3: Tutorials ---
  console.log('\n--- Batch 3: Tutorials (FR) ---');
  const tutRaw = await callClaude(client, SYSTEM_PROMPT, promptTutorials(sources), 'tutorials');
  const tutFiles = parseFiles(tutRaw);

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
  const enFiles = parseFiles(enRaw);

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
