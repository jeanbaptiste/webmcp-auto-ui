// generate-docs.pipeline.ts — Full documentation generation pipeline
// Usage: npx tsx scripts/generate-docs.pipeline.ts
//
// Steps:
//   1. Extract facts (ts-morph analysis)
//   2. Generate Mermaid diagrams
//   3. Render diagrams to SVG
//   4. Generate prose documentation via Claude API

import { execSync } from 'node:child_process';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '..');

interface Step {
  name: string;
  script: string;
}

const STEPS: Step[] = [
  { name: 'Extract facts', script: 'scripts/extract-facts.ts' },
  { name: 'Generate diagrams', script: 'scripts/generate-diagrams.ts' },
  { name: 'Render SVGs', script: 'scripts/render-diagrams.ts' },
  { name: 'Generate prose', script: 'scripts/generate-prose.ts' },
];

function main() {
  console.log('=== WebMCP Auto-UI — Documentation Pipeline ===\n');
  const totalStart = Date.now();

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    const label = `[${i + 1}/${STEPS.length}]`;

    console.log(`\n${label} ${step.name}...`);
    console.log('-'.repeat(50));

    const start = Date.now();
    try {
      execSync(`npx tsx ${step.script}`, {
        stdio: 'inherit',
        cwd: ROOT,
        env: { ...process.env },
      });
    } catch (err: any) {
      console.error(`\n${label} FAILED: ${step.name}`);
      console.error(`  Script: ${step.script}`);
      console.error(`  ${err.message ?? err}`);
      process.exit(1);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n${label} ${step.name} done (${elapsed}s)`);
  }

  const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Pipeline complete in ${totalElapsed}s`);
  console.log(`\nOutputs:`);
  console.log(`  - docs/facts.json`);
  console.log(`  - docs/diagrams/*.mmd`);
  console.log(`  - docs/diagrams/svg/*.svg`);
  console.log(`  - docs/generated/*.md`);
}

main();
