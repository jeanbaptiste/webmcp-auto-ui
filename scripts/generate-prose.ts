// generate-prose.ts — Generate documentation prose from facts.json via Claude API
// Usage: npx tsx scripts/generate-prose.ts
//        npx tsx scripts/generate-prose.ts --dry-run

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import * as path from 'node:path';

/* ------------------------------------------------------------------ */
/*  Types (mirror of extract-facts.ts output)                          */
/* ------------------------------------------------------------------ */

interface ExportFact {
  name: string;
  kind: string;
  signature: string;
  jsdoc?: string;
  deprecated?: boolean;
}

interface ImportFact {
  from: string;
  symbols: string[];
}

interface InterfaceFact {
  name: string;
  properties: { name: string; type: string; optional: boolean }[];
}

interface FunctionFact {
  name: string;
  signature: string;
  params: { name: string; type: string }[];
  returnType: string;
}

interface PackageFacts {
  name: string;
  exports: ExportFact[];
  imports: ImportFact[];
  interfaces: InterfaceFact[];
  functions: FunctionFact[];
}

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const ROOT = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '..');
const FACTS_PATH = path.join(ROOT, 'docs', 'facts.json');
const SVG_DIR = path.join(ROOT, 'docs', 'diagrams', 'svg');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'generated');
const MODEL = 'claude-haiku-4-5-20251001';
const DRY_RUN = process.argv.includes('--dry-run');

const PKG_PREFIX = '@webmcp-auto-ui/';

/** Map diagram SVGs to the packages they are most relevant to */
const DIAGRAM_RELEVANCE: Record<string, string[]> = {
  'architecture.svg': ['core', 'agent', 'sdk', 'ui'],
  'exports.svg': ['core', 'agent', 'sdk', 'ui'],
  'agent-flow.svg': ['agent', 'core'],
  'interfaces.svg': ['core', 'agent'],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function shortName(fullName: string): string {
  return fullName.startsWith(PKG_PREFIX) ? fullName.slice(PKG_PREFIX.length) : fullName;
}

function getRelevantDiagrams(pkgShort: string): string[] {
  const relevant: string[] = [];
  for (const [svg, pkgs] of Object.entries(DIAGRAM_RELEVANCE)) {
    if (pkgs.includes(pkgShort)) {
      relevant.push(svg);
    }
  }
  return relevant;
}

function buildPrompt(pkg: PackageFacts): string {
  const short = shortName(pkg.name);

  // Build exports section
  const exportsList = pkg.exports
    .map(e => {
      const deprecated = e.deprecated ? ' **(deprecated)**' : '';
      const jsdoc = e.jsdoc ? `\n  JSDoc: ${e.jsdoc.split('\n').slice(0, 3).join(' ')}` : '';
      return `- \`${e.signature}\`${deprecated}${jsdoc}`;
    })
    .join('\n');

  // Build interfaces section
  const interfacesList = pkg.interfaces
    .map(i => {
      const props = i.properties
        .map(p => `  - \`${p.name}${p.optional ? '?' : ''}: ${p.type}\``)
        .join('\n');
      return `### ${i.name}\n${props}`;
    })
    .join('\n\n');

  // Build functions section
  const functionsList = pkg.functions
    .map(f => {
      const params = f.params.map(p => `\`${p.name}: ${p.type}\``).join(', ');
      return `- \`${f.name}(${f.params.map(p => p.name).join(', ')})\` -> \`${f.returnType}\`\n  Params: ${params}`;
    })
    .join('\n');

  // Build imports section
  const importsList = pkg.imports
    .map(i => `- from \`${i.from}\`: ${i.symbols.join(', ')}`)
    .join('\n');

  // Build diagram references
  const diagrams = getRelevantDiagrams(short);
  const diagramSection = diagrams.length > 0
    ? `\nRelevant diagrams (reference them in the doc with relative paths):\n${diagrams.map(d => `- ![${d.replace('.svg', '')}](../diagrams/svg/${d})`).join('\n')}`
    : '';

  return `You are a technical documentation writer. Generate a comprehensive documentation page in Markdown for the package "${pkg.name}".

The documentation should include:
1. **Overview** — What the package does, its role in the WebMCP Auto-UI monorepo
2. **Installation** — How to import it (it's a workspace package: \`import { ... } from '${pkg.name}'\`)
3. **API Reference** — All exported symbols with their signatures and descriptions
4. **Interfaces** — Detailed property tables for each interface
5. **Usage Examples** — Practical code examples showing common use cases
6. **Dependencies** — What other packages it depends on

Write in English. Be concise but thorough. Use code blocks with TypeScript syntax highlighting.
${diagramSection}

## Facts

### Exports (${pkg.exports.length})
${exportsList || 'None'}

### Interfaces (${pkg.interfaces.length})
${interfacesList || 'None'}

### Functions (${pkg.functions.length})
${functionsList || 'None'}

### Inter-package imports
${importsList || 'None (standalone package)'}`;
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('WebMCP Auto-UI — Prose Documentation Generator\n');

  // Check facts.json exists
  if (!existsSync(FACTS_PATH)) {
    console.error('Error: docs/facts.json not found.');
    console.error('Run npm run docs:facts first.');
    process.exit(1);
  }

  const facts: PackageFacts[] = JSON.parse(readFileSync(FACTS_PATH, 'utf-8'));
  console.log(`Loaded ${facts.length} packages from facts.json`);

  // Dry-run mode
  if (DRY_RUN) {
    console.log('\nDRY RUN — files that would be generated:\n');
    for (const pkg of facts) {
      const short = shortName(pkg.name);
      console.log(`  docs/generated/${short}.md (${pkg.exports.length} exports, ${pkg.functions.length} functions)`);
    }
    console.log(`\nTotal: ${facts.length} files`);
    console.log(`Model: ${MODEL}`);
    console.log(`SVG dir exists: ${existsSync(SVG_DIR)}`);
    return;
  }

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      'ERROR: ANTHROPIC_API_KEY environment variable is not set.\n' +
      'Set it before running: export ANTHROPIC_API_KEY=sk-ant-...\n' +
      'Or use --dry-run to preview without calling the API.',
    );
    process.exit(1);
  }

  const client = new Anthropic();

  // Create output directory
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate prose for each package
  for (const pkg of facts) {
    const short = shortName(pkg.name);
    const outPath = path.join(OUTPUT_DIR, `${short}.md`);

    console.log(`\nGenerating prose for ${pkg.name}...`);
    const start = Date.now();

    const prompt = buildPrompt(pkg);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    writeFileSync(outPath, text + '\n', 'utf-8');

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const { input_tokens, output_tokens } = response.usage;
    console.log(`  Wrote ${outPath} (${elapsed}s, input: ${input_tokens}, output: ${output_tokens})`);
  }

  console.log(`\nDone. ${facts.length} documentation files written to ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
