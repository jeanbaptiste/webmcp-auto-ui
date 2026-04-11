// render-diagrams.ts — Render Mermaid .mmd files to SVG via @mermaid-js/mermaid-cli
// Usage: npx tsx scripts/render-diagrams.ts

import { execSync } from 'node:child_process';
import { readdirSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '..');
const DIAGRAMS_DIR = path.join(ROOT, 'docs', 'diagrams');
const SVG_DIR = path.join(DIAGRAMS_DIR, 'svg');

function main() {
  const diagrams = readdirSync(DIAGRAMS_DIR).filter(f => f.endsWith('.mmd'));

  if (diagrams.length === 0) {
    console.error('No .mmd files found in docs/diagrams/.');
    console.error('Run npm run docs:diagrams first.');
    process.exit(1);
  }

  mkdirSync(SVG_DIR, { recursive: true });

  console.log(`Rendering ${diagrams.length} diagrams to SVG...\n`);

  for (const file of diagrams) {
    const name = file.replace('.mmd', '');
    const input = path.join(DIAGRAMS_DIR, file);
    const output = path.join(SVG_DIR, `${name}.svg`);

    console.log(`  ${file} -> svg/${name}.svg`);
    execSync(
      `npx mmdc -i "${input}" -o "${output}" -t dark -b transparent`,
      { stdio: 'inherit', cwd: ROOT },
    );
  }

  console.log(`\nDone. ${diagrams.length} SVGs written to ${SVG_DIR}/`);
}

main();
