#!/usr/bin/env node
/**
 * Reads all .md recipe files from packages/agent/src/recipes/
 * and generates a _generated.ts exporting them as string constants.
 *
 * Usage: node scripts/recipes-to-ts.js
 * Called automatically via packages/agent prebuild script.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const recipesDir = join(__dirname, '..', 'packages', 'agent', 'src', 'recipes');
const outFile = join(recipesDir, '_generated.ts');

const mdFiles = readdirSync(recipesDir).filter(f => f.endsWith('.md')).sort();

if (mdFiles.length === 0) {
  console.log('[recipes-to-ts] No .md files found, writing empty export.');
  writeFileSync(outFile, '// Auto-generated — do not edit. Run: node scripts/recipes-to-ts.js\nexport const RAW_RECIPES: Record<string, string> = {};\n');
  process.exit(0);
}

let ts = '// Auto-generated from .md files — do not edit. Run: node scripts/recipes-to-ts.js\n\n';
ts += 'export const RAW_RECIPES: Record<string, string> = {\n';

for (const file of mdFiles) {
  const key = basename(file, '.md');
  const content = readFileSync(join(recipesDir, file), 'utf-8');
  // Escape backticks and ${} in template literals
  const escaped = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  ts += `  '${key}': \`${escaped}\`,\n`;
}

ts += '};\n';

writeFileSync(outFile, ts);
console.log(`[recipes-to-ts] Generated ${outFile} with ${mdFiles.length} recipes.`);
