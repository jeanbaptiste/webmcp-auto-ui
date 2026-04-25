#!/usr/bin/env node
// ============================================================================
// docs-update.mjs — Documentation updater for webmcp-auto-ui (no LLM)
// ============================================================================
//
// 100% mechanical pipeline. No Claude CLI dependency.
// Intelligent redaction/translation is done manually in a Claude Code session.
//
// USAGE:
//   node scripts/docs-update.mjs                  # auto-detect changes, full pipeline
//   node scripts/docs-update.mjs --all            # skip change detection, analyze everything
//   node scripts/docs-update.mjs --svg-only       # only re-render Mermaid SVGs
//   node scripts/docs-update.mjs --dry-run        # show impact report, don't render/build
//   node scripts/docs-update.mjs --yes|-y         # skip confirmation prompts
//
// ============================================================================

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, rmSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { tmpdir } from 'os';

// ─── Paths ─────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const DOCS_FR = join(ROOT, 'docs/starlight/src/content/docs');
const DOCS_EN = join(ROOT, 'docs/starlight/src/content/docs/en');
const DIAGRAMS = join(ROOT, 'docs/starlight/public/diagrams');
const SNAPSHOT_LIGHT = join(ROOT, '.docs-snapshot-light.txt');
const MANIFEST = join(ROOT, '.docs-manifest.json');
const LASTRUN = join(ROOT, '.docs-lastrun');

// ─── ANSI Colors ───────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

const ok = (msg) => console.log(`  ${C.green}✓${C.reset} ${msg}`);
const fail = (msg) => console.log(`  ${C.red}✗${C.reset} ${msg}`);
const info = (msg) => console.log(`  ${C.dim}[docs]${C.reset} ${msg}`);
const step = (msg) => console.log(`\n${C.cyan}${C.bold}=== ${msg} ===${C.reset}`);

function die(msg) {
  console.error(`${C.red}ERROR:${C.reset} ${msg}`);
  process.exit(1);
}

// ─── Impact map: code path prefix → potentially impacted doc files ─────────

const IMPACT_MAP = {
  'packages/core/': ['packages/sdk.mdx', 'packages/ui.mdx', 'guide/architecture.mdx'],
  'packages/agent/': ['packages/agent.mdx', 'guide/architecture.mdx'],
  'packages/sdk/': ['packages/sdk.mdx'],
  'packages/ui/': ['packages/ui.mdx'],
  'apps/flex2/': ['apps/multi-svelte.md', 'apps/boilerplate.md'],
  'apps/multi-svelte/': ['apps/multi-svelte.md'],
  'apps/boilerplate/': ['apps/boilerplate.md'],
  'apps/recipes/': ['apps/recipes.md'],
  'scripts/deploy.sh': ['guide/architecture.mdx'],
  'mcp-proxies/': ['guide/connect-mcp-server.mdx'],
};

// ─── Argument parsing ──────────────────────────────────────────────────────

let MODE = 'auto';
let DRY_RUN = false;
let AUTO_YES = false;

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  switch (arg) {
    case '--all':      MODE = 'all'; break;
    case '--dry-run':  DRY_RUN = true; break;
    case '--svg-only': MODE = 'svg-only'; break;
    case '--yes':
    case '-y':         AUTO_YES = true; break;
    default:           die(`Unknown option: ${arg}`);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: opts.stdio || 'pipe', ...opts }).trim();
  } catch (e) {
    if (opts.ignoreError) return '';
    throw e;
  }
}

function findFiles(dir, ext) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip the EN directory when scanning FR docs
      if (full === DOCS_EN) continue;
      results.push(...findFiles(full, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

function askConfirmation(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

// ─── Preflight ─────────────────────────────────────────────────────────────

function preflight() {
  // Test write permissions
  for (const [label, dir] of [['FR docs', DOCS_FR], ['EN docs', DOCS_EN], ['diagrams', DIAGRAMS]]) {
    mkdirSync(dir, { recursive: true });
    const testFile = join(dir, `.write-test-${process.pid}`);
    try {
      writeFileSync(testFile, 'test');
      unlinkSync(testFile);
    } catch {
      die(`Cannot write to ${dir} — check permissions.`);
    }
  }
  info('Write permissions OK (FR, EN, diagrams)');
}

// ============================================================================
// STEP 1 — Create a snapshot of the codebase
// ============================================================================

function createSnapshot() {
  step('Step 1 — Creating codebase snapshot with repomix');
  const output = run(
    `npx --yes repomix \
      --output "${SNAPSHOT_LIGHT}" \
      --include "packages/*/src/index.ts,packages/*/src/types.ts,packages/*/package.json,apps/*/package.json,apps/*/src/routes/+page.svelte,CLAUDE.md,README.md,scripts/deploy.sh,mcp-proxies/README.md" \
      --ignore "**/node_modules/**,.docs-*" 2>&1 | tail -3`,
    { stdio: ['pipe', 'pipe', 'pipe'] }
  );
  if (output) console.log(output);

  const size = readFileSync(SNAPSHOT_LIGHT, 'utf8');
  const lines = size.split('\n').length;
  const kb = Math.round(Buffer.byteLength(size) / 1024);
  info(`Light snapshot: ${lines} lines, ${kb}KB`);
}

// ============================================================================
// STEP 2 — Detect what changed since the last run
// ============================================================================

function detectChanges() {
  step('Step 2 — Detecting changes since last run');

  if (MODE === 'all') {
    info('Mode --all: skipping change detection, will analyze everything');
    return { changelog: '(full regeneration requested)', changedFiles: getAllCodeFiles() };
  }

  if (!existsSync(LASTRUN)) {
    info('No .docs-lastrun file found — treating as first run (--all)');
    return { changelog: '(first run)', changedFiles: getAllCodeFiles() };
  }

  const since = readFileSync(LASTRUN, 'utf8').trim();
  const changelog = run(`git log --since="${since}" --stat --oneline`, { ignoreError: true });

  if (!changelog) {
    info(`No commits since last run (${since}). Nothing to do.`);
    process.exit(0);
  }

  const commitCount = (changelog.match(/^[0-9a-f]/gm) || []).length;
  info(`${commitCount} commits since ${since}`);

  // Extract changed file paths from git log --stat lines
  const changedFiles = extractChangedFilesFromLog(changelog);

  return { changelog, changedFiles };
}

function getAllCodeFiles() {
  // Return all prefixes from the impact map as "changed"
  return Object.keys(IMPACT_MAP);
}

function extractChangedFilesFromLog(log) {
  const files = new Set();
  for (const line of log.split('\n')) {
    // git log --stat lines look like: " packages/core/src/utils.ts | 5 ++-"
    const match = line.match(/^\s+(\S+)\s+\|\s+\d+/);
    if (match) {
      files.add(match[1]);
    }
  }
  return [...files];
}

// ============================================================================
// STEP 3 — Mechanical impact analysis
// ============================================================================

function analyzeImpact(changedFiles) {
  step('Step 3 — Mechanical impact analysis');

  const impactedDocs = new Map(); // docFile -> Set of reasons

  for (const file of changedFiles) {
    for (const [prefix, docs] of Object.entries(IMPACT_MAP)) {
      if (file.startsWith(prefix) || file === prefix) {
        for (const doc of docs) {
          if (!impactedDocs.has(doc)) impactedDocs.set(doc, new Set());
          impactedDocs.get(doc).add(`${prefix} changed`);
        }
      }
    }
  }

  // Build manifest
  const sinceCommit = run('git rev-parse --short HEAD', { ignoreError: true }) || 'unknown';
  const manifest = {
    changedFiles,
    impactedDocs: [...impactedDocs.entries()].map(([file, reasons]) => ({
      file,
      reason: [...reasons].join('; '),
    })),
    sinceCommit,
    timestamp: new Date().toISOString(),
  };

  // Print colored report
  console.log('');
  if (manifest.impactedDocs.length === 0) {
    info('No documentation files impacted by recent changes.');
  } else {
    console.log(`  ${C.bold}Impacted documentation:${C.reset}`);
    for (const doc of manifest.impactedDocs) {
      console.log(`    ${C.yellow}→${C.reset} ${doc.file} ${C.dim}(${doc.reason})${C.reset}`);
    }
  }
  console.log(`  ${C.dim}Changed code files: ${changedFiles.length}${C.reset}`);
  console.log(`  ${C.dim}Impacted docs: ${manifest.impactedDocs.length}${C.reset}`);

  // Save manifest
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  info(`Saved manifest to ${relative(ROOT, MANIFEST)}`);

  return manifest;
}

// ============================================================================
// STEP 4 — Validate manifest (user confirmation)
// ============================================================================

async function validateManifest() {
  step('Step 4 — Validate manifest');

  if (DRY_RUN) {
    info('Dry run — stopping here. Review .docs-manifest.json and re-run without --dry-run.');
    process.exit(0);
  }

  if (AUTO_YES) {
    info('Auto-yes mode — skipping manual validation.');
    return;
  }

  console.log('');
  console.log('  Review the manifest above.');
  console.log(`  - Edit ${relative(ROOT, MANIFEST)} to remove entries you don't want.`);
  console.log('  - Press ENTER to proceed, or Ctrl+C to abort.');
  console.log('');
  await askConfirmation('');
}

// ============================================================================
// STEP 5 — Render Mermaid diagrams to SVG
// ============================================================================

function renderSvgs() {
  step('Step 5 — Rendering Mermaid diagrams to SVG');

  mkdirSync(DIAGRAMS, { recursive: true });
  const tmpDir = join(tmpdir(), `docs-update-mermaid-${process.pid}`);
  mkdirSync(tmpDir, { recursive: true });

  let pass = 0;
  let failed = 0;

  // Find all .mdx files with mermaid blocks (FR only — EN shares same SVGs)
  const mdxFiles = findFiles(DOCS_FR, '.mdx');

  for (const file of mdxFiles) {
    const content = readFileSync(file, 'utf8');
    if (!content.includes('```mermaid')) continue;

    const base = basename(file, '.mdx');
    const lines = content.split('\n');
    let idx = 0;
    let inBlock = false;
    let blockContent = '';

    for (const line of lines) {
      if (line.trim() === '```mermaid') {
        inBlock = true;
        blockContent = '';
        continue;
      }
      if (inBlock && line.trim() === '```') {
        inBlock = false;
        idx++;
        const name = `${base}-${idx}`;
        const mmdPath = join(tmpDir, `${name}.mmd`);
        writeFileSync(mmdPath, blockContent);

        try {
          run(
            `npx --yes @mermaid-js/mermaid-cli -i "${mmdPath}" -o "${join(DIAGRAMS, `${name}.svg`)}" --backgroundColor transparent -q`,
            { stdio: ['pipe', 'pipe', 'pipe'] }
          );
          ok(`${name}.svg`);
          pass++;
        } catch {
          fail(`${name}.svg (check ${mmdPath})`);
          failed++;
        }
        continue;
      }
      if (inBlock) {
        blockContent += line + '\n';
      }
    }
  }

  // Also render standalone .mmd files from docs/diagrams/
  const standaloneDir = join(ROOT, 'docs/diagrams');
  if (existsSync(standaloneDir)) {
    for (const entry of readdirSync(standaloneDir)) {
      if (!entry.endsWith('.mmd')) continue;
      const mmdPath = join(standaloneDir, entry);
      const name = `standalone-${basename(entry, '.mmd')}`;
      try {
        run(
          `npx --yes @mermaid-js/mermaid-cli -i "${mmdPath}" -o "${join(DIAGRAMS, `${name}.svg`)}" --backgroundColor transparent -q`,
          { stdio: ['pipe', 'pipe', 'pipe'] }
        );
        ok(`${name}.svg`);
        pass++;
      } catch {
        fail(`${name}.svg`);
        failed++;
      }
    }
  }

  // Cleanup
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}

  info(`Done: ${pass} rendered, ${failed} failed`);
}

// ============================================================================
// STEP 6 — Sync (run existing sync-docs.js)
// ============================================================================

function syncDocs() {
  step('Step 6 — Sync docs');
  info('Running npm run docs:sync...');
  try {
    const output = run('npm run docs:sync 2>&1 | tail -5');
    if (output) console.log(output);
    ok('sync-docs complete');
  } catch (e) {
    fail(`sync-docs failed: ${e.message}`);
  }
}

// ============================================================================
// STEP 7 — Build (run astro build)
// ============================================================================

function buildDocs() {
  step('Step 7 — Build docs/starlight');
  info('Running astro build...');
  try {
    const output = run(`npm --prefix "${join(ROOT, 'docs/starlight')}" run build 2>&1 | tail -5`);
    if (output) console.log(output);
    ok('Build successful');
  } catch (e) {
    fail(`Build failed: ${e.message}`);
  }
}

// ============================================================================
// STEP 8 — Save timestamp
// ============================================================================

function saveTimestamp() {
  const ts = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  writeFileSync(LASTRUN, ts + '\n');
  info(`Saved lastrun timestamp: ${ts}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`${C.bold}docs-update.mjs${C.reset} — webmcp-auto-ui documentation updater (no LLM)\n`);

  preflight();

  switch (MODE) {
    case 'svg-only':
      renderSvgs();
      break;

    case 'auto':
    case 'all': {
      createSnapshot();
      const { changedFiles } = detectChanges();
      analyzeImpact(changedFiles);
      await validateManifest();
      renderSvgs();
      syncDocs();
      buildDocs();
      saveTimestamp();
      break;
    }
  }

  console.log(`\n${C.green}${C.bold}Done.${C.reset}`);
}

main().catch((e) => {
  die(e.message);
});
