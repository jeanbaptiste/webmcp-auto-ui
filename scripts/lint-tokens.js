#!/usr/bin/env node
/**
 * lint-tokens.js — Enforce design token usage in Svelte files
 *
 * Forbidden patterns (use CSS variables / theme tokens instead):
 *   text-zinc-*        → use text-text1, text-text2, text-accent, etc.
 *   bg-[#...]          → use bg-surface, bg-surface2, bg-bg, etc.
 *   border-white/      → use border-border, border-border2, etc.
 *
 * Usage:
 *   node scripts/lint-tokens.js            # check all apps
 *   node scripts/lint-tokens.js --fix      # (future) auto-fix
 *   node scripts/lint-tokens.js apps/todo  # check specific path
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const SCAN_PATHS = args.length > 0
  ? args.map(p => join(ROOT, p))
  : [join(ROOT, 'apps')];

const RULES = [
  {
    pattern: /\btext-zinc-\d+\b/g,
    name: 'text-zinc-*',
    suggestion: 'use text-text1, text-text2, text-accent, text-teal, text-amber, text-accent2',
  },
  {
    pattern: /\bbg-\[#[0-9a-fA-F]+\]/g,
    name: 'bg-[#hex]',
    suggestion: 'use bg-surface, bg-surface2, bg-bg, bg-border2',
  },
  {
    pattern: /\bborder-white\/\d+\b/g,
    name: 'border-white/*',
    suggestion: 'use border-border, border-border2',
  },
];

function* walkSvelte(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.svelte-kit') {
      yield* walkSvelte(full);
    } else if (entry.isFile() && entry.name.endsWith('.svelte')) {
      yield full;
    }
  }
}

let totalViolations = 0;
const fileViolations = new Map();

for (const scanPath of SCAN_PATHS) {
  const stat = statSync(scanPath, { throwIfNoEntry: false });
  if (!stat) { console.error(`Path not found: ${scanPath}`); process.exit(1); }
  const files = stat.isDirectory() ? [...walkSvelte(scanPath)] : [scanPath];

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');
    const violations = [];

    for (const rule of RULES) {
      for (let i = 0; i < lines.length; i++) {
        const matches = [...lines[i].matchAll(new RegExp(rule.pattern.source, 'g'))];
        for (const match of matches) {
          violations.push({ line: i + 1, col: match.index + 1, match: match[0], rule });
        }
      }
    }

    if (violations.length > 0) {
      fileViolations.set(file, violations);
      totalViolations += violations.length;
    }
  }
}

if (totalViolations === 0) {
  console.log('✓ No token violations found.');
  process.exit(0);
}

for (const [file, violations] of fileViolations) {
  console.log(`\n${relative(ROOT, file)}`);
  for (const v of violations) {
    console.log(`  ${v.line}:${v.col}  \x1b[33m${v.match}\x1b[0m  → ${v.rule.suggestion}`);
  }
}

console.log(`\n✗ ${totalViolations} violation${totalViolations > 1 ? 's' : ''} in ${fileViolations.size} file${fileViolations.size > 1 ? 's' : ''}`);
console.log('  Replace hardcoded Tailwind colors with design tokens from the theme.');
process.exit(1);
