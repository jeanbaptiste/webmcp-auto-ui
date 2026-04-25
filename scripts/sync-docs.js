#!/usr/bin/env node

/**
 * sync-docs.js — Keeps documentation in sync with source code.
 *
 * Parses source code and updates auto-generated sections in .md files.
 *
 * Usage: node scripts/sync-docs.js
 *        npm run docs:sync
 *
 * Auto-generated sections in .md files are delimited by:
 *   <!-- AUTO:SECTION_NAME -->
 *   ...generated content...
 *   <!-- /AUTO:SECTION_NAME -->
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const PKGS = path.join(ROOT, 'packages');

// ─── 1. EXTRACT DATA FROM SOURCE ─────────────────────────────────────────

function extractTokens() {
  const src = fs.readFileSync(path.join(PKGS, 'ui/src/theme/tokens.ts'), 'utf8');
  const lightMatch = src.match(/LIGHT_TOKENS:\s*ThemeTokens\s*=\s*\{([^}]+)\}/s);
  const darkMatch = src.match(/DARK_TOKENS:\s*ThemeTokens\s*=\s*\{([^}]+)\}/s);
  if (!lightMatch || !darkMatch) return [];

  const parseTokens = (block) =>
    [...block.matchAll(/'([^']+)':\s*'([^']+)'/g)].map(m => ({ name: m[1], value: m[2] }));

  const light = parseTokens(lightMatch[1]);
  const dark = parseTokens(darkMatch[1]);
  const darkMap = Object.fromEntries(dark.map(t => [t.name, t.value]));

  const usage = {
    'color-bg': 'Page background',
    'color-surface': 'Card / panel background',
    'color-surface2': 'Nested surfaces, hover states',
    'color-border': 'Subtle borders',
    'color-border2': 'Stronger borders, active states',
    'color-accent': 'Primary accent, links, buttons',
    'color-accent2': 'Destructive / error accent',
    'color-amber': 'Warnings, attention',
    'color-teal': 'Success, positive trends',
    'color-text1': 'Primary text',
    'color-text2': 'Secondary / muted text',
  };

  return light.map(t => ({
    name: t.name,
    light: t.value,
    dark: darkMap[t.name] || t.value,
    usage: usage[t.name] || '',
  }));
}

function extractUIExports() {
  const src = fs.readFileSync(path.join(PKGS, 'ui/src/index.ts'), 'utf8');
  const components = [];
  const typeExports = [];

  for (const m of src.matchAll(/export\s*\{\s*default\s+as\s+(\w+)\s*\}\s*from\s*'([^']+)'/g)) {
    components.push({ name: m[1], path: m[2] });
  }
  // Named exports (base components)
  for (const m of src.matchAll(/export\s*\{\s*([^}]+)\}\s*from\s*'([^']+)'/g)) {
    const names = m[1].split(',').map(n => n.trim()).filter(n => n && !n.startsWith('type ') && !n.startsWith('default'));
    for (const name of names) {
      if (!components.find(c => c.name === name)) {
        components.push({ name, path: m[2] });
      }
    }
  }
  return components;
}

function extractBlockTypes() {
  const src = fs.readFileSync(path.join(PKGS, 'sdk/src/stores/canvas.svelte.ts'), 'utf8');
  const match = src.match(/export type BlockType\s*=\s*([\s\S]*?);/);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

function extractAppPorts() {
  const ports = { home: 5173, flex: 5174, todo: 5175, viewer: 5176, showcase: 5177 };
  // Try to read from vite configs
  const apps = ['home', 'flex', 'todo', 'viewer', 'showcase'];
  for (const app of apps) {
    try {
      const viteConfig = fs.readFileSync(path.join(ROOT, `apps/${app}/vite.config.ts`), 'utf8');
      const portMatch = viteConfig.match(/port:\s*(\d+)/);
      if (portMatch) ports[app] = parseInt(portMatch[1]);
    } catch {}
  }
  return ports;
}

// ─── 2. UPDATE AUTO SECTIONS IN .MD FILES ─────────────────────────────────

function updateAutoSections(filePath, sections) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [name, newContent] of Object.entries(sections)) {
    const regex = new RegExp(
      `(<!-- AUTO:${name} -->\\n)[\\s\\S]*?(<!-- /AUTO:${name} -->)`,
      'g'
    );
    if (regex.test(content)) {
      content = content.replace(regex, `$1${newContent}\n$2`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
  }
  return changed;
}

// ─── 3. GENERATE SECTION CONTENT ──────────────────────────────────────────

function generateTokensTable(tokens) {
  let md = '| Token | Light | Dark | Usage |\n';
  md += '|---|---|---|---|\n';
  for (const t of tokens) {
    md += `| \`${t.name}\` | \`${t.light}\` | \`${t.dark}\` | ${t.usage} |\n`;
  }
  return md;
}

function generateComponentsList(components) {
  const categories = {
    'Theme': [], 'Base': [], 'Primitives': [],
    'Simple blocks': [], 'Rich widgets': [],
    'Window Manager': [], 'Dispatcher': [],
    'Messaging': [], 'Other': [],
  };

  for (const c of components) {
    if (c.path.includes('theme/')) categories['Theme'].push(c.name);
    else if (c.path.includes('base/')) categories['Base'].push(c.name);
    else if (c.path.includes('primitives/')) categories['Primitives'].push(c.name);
    else if (c.path.includes('simple/')) categories['Simple blocks'].push(c.name);
    else if (c.path.includes('rich/')) categories['Rich widgets'].push(c.name);
    else if (c.path.includes('wm/')) categories['Window Manager'].push(c.name);
    else if (c.path.includes('BlockRenderer')) categories['Dispatcher'].push(c.name);
    else if (c.path.includes('messaging/')) categories['Messaging'].push(c.name);
    else categories['Other'].push(c.name);
  }

  let md = '';
  for (const [cat, names] of Object.entries(categories)) {
    if (names.length === 0) continue;
    md += `- **${cat}** (${names.length}): ${names.join(', ')}\n`;
  }
  md += `\n**Total: ${components.length} exports**\n`;
  return md;
}

function generateBlockTypesList(types) {
  return types.map(t => `\`${t}\``).join(', ') + `\n\n**Total: ${types.length} block types**\n`;
}

function generatePortsTable(ports) {
  let md = '| App | Port | URL |\n|---|---|---|\n';
  for (const [app, port] of Object.entries(ports)) {
    md += `| ${app} | ${port} | http://localhost:${port} |\n`;
  }
  return md;
}

// ─── 4. MAIN ──────────────────────────────────────────────────────────────

function main() {
  console.log('docs:sync — syncing documentation with source code\n');

  // Extract data
  const tokens = extractTokens();
  const components = extractUIExports();
  const blockTypes = extractBlockTypes();
  const ports = extractAppPorts();

  console.log(`  extracted: ${tokens.length} tokens, ${components.length} UI exports, ${blockTypes.length} block types`);

  // Prepare auto-generated sections
  const sections = {
    TOKENS: generateTokensTable(tokens),
    COMPONENTS: generateComponentsList(components),
    BLOCK_TYPES: generateBlockTypesList(blockTypes),
    PORTS: generatePortsTable(ports),
  };

  // Update all .md files that have AUTO markers
  let updatedFiles = 0;
  const mdFiles = findMdFiles(DOCS);
  for (const file of mdFiles) {
    if (updateAutoSections(file, sections)) {
      console.log(`  updated: ${path.relative(ROOT, file)}`);
      updatedFiles++;
    }
  }

  // Also check README.md at root
  const readmePath = path.join(ROOT, 'README.md');
  if (fs.existsSync(readmePath) && updateAutoSections(readmePath, sections)) {
    console.log(`  updated: README.md`);
    updatedFiles++;
  }

  console.log(`  ${updatedFiles} files updated with auto-generated content`);

  console.log('\ndocs:sync complete.\n');
}

function findMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

main();
