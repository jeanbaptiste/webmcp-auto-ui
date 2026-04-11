// generate-diagrams.ts — Read docs/facts.json and generate Mermaid diagrams
// Usage: npx tsx scripts/generate-diagrams.ts

import * as path from 'node:path';
import * as fs from 'node:fs';

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
const DIAGRAMS_DIR = path.join(ROOT, 'docs', 'diagrams');

const PKG_PREFIX = '@webmcp-auto-ui/';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Shorten @webmcp-auto-ui/core → core */
function shortName(fullName: string): string {
  return fullName.startsWith(PKG_PREFIX) ? fullName.slice(PKG_PREFIX.length) : fullName;
}

/** Escape special characters for Mermaid labels */
function mermaidEscape(s: string): string {
  return s.replace(/"/g, '#quot;').replace(/</g, '#lt;').replace(/>/g, '#gt;');
}

/** Truncate long type strings */
function truncateType(s: string, max = 40): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + '...';
}

/** Kind → symbol prefix for classDiagram */
function kindPrefix(kind: string): string {
  switch (kind) {
    case 'function': return '+';
    case 'class': return '+';
    case 'interface': return '<<interface>> ';
    case 'type': return '<<type>> ';
    case 'const': return '+';
    case 'enum': return '<<enum>> ';
    default: return '+';
  }
}

/* ------------------------------------------------------------------ */
/*  Diagram 1 — Architecture packages (graph TD)                       */
/* ------------------------------------------------------------------ */

function generateArchitectureDiagram(facts: PackageFacts[]): string {
  const lines: string[] = ['graph TD'];

  // Declare nodes
  for (const pkg of facts) {
    const short = shortName(pkg.name);
    lines.push(`  ${short}["${pkg.name}"]`);
  }

  lines.push('');

  // Edges from imports
  const edges = new Set<string>();
  for (const pkg of facts) {
    const from = shortName(pkg.name);
    for (const imp of pkg.imports) {
      const to = shortName(imp.from);
      const edge = `${from} --> ${to}`;
      if (!edges.has(edge)) {
        edges.add(edge);
        lines.push(`  ${edge}`);
      }
    }
  }

  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------------------ */
/*  Diagram 2 — Exports par package (classDiagram)                     */
/* ------------------------------------------------------------------ */

function generateExportsDiagram(facts: PackageFacts[]): string {
  const lines: string[] = ['classDiagram'];

  for (const pkg of facts) {
    if (pkg.exports.length === 0) continue;

    const className = shortName(pkg.name).charAt(0).toUpperCase() + shortName(pkg.name).slice(1);
    lines.push(`  class ${className} {`);

    // Group exports by kind
    const grouped = new Map<string, ExportFact[]>();
    for (const exp of pkg.exports) {
      const kind = exp.kind;
      if (!grouped.has(kind)) grouped.set(kind, []);
      grouped.get(kind)!.push(exp);
    }

    // Functions first, then interfaces/types, then consts
    const kindOrder = ['function', 'class', 'interface', 'type', 'const', 'enum', 'unknown'];
    for (const kind of kindOrder) {
      const items = grouped.get(kind);
      if (!items) continue;
      for (const exp of items) {
        const deprecated = exp.deprecated ? '~~' : '';
        if (kind === 'function') {
          // Extract params and return from signature
          const match = exp.signature.match(/\(([^)]*)\)\s*(?:=>|:)\s*(.+)$/);
          const ret = match ? truncateType(match[2].trim()) : '';
          lines.push(`    ${deprecated}+${exp.name}()${ret ? ' ' + mermaidEscape(ret) : ''}${deprecated}`);
        } else if (kind === 'interface' || kind === 'type') {
          lines.push(`    ${deprecated}<<${kind}>> ${exp.name}${deprecated}`);
        } else if (kind === 'class') {
          lines.push(`    ${deprecated}+${exp.name}${deprecated}`);
        } else if (kind === 'enum') {
          lines.push(`    ${deprecated}<<enum>> ${exp.name}${deprecated}`);
        } else {
          lines.push(`    ${deprecated}+${exp.name}${deprecated}`);
        }
      }
    }

    lines.push('  }');
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------------------ */
/*  Diagram 3 — Flow agent loop (sequenceDiagram)                      */
/* ------------------------------------------------------------------ */

function generateAgentFlowDiagram(facts: PackageFacts[]): string {
  const agentPkg = facts.find(p => shortName(p.name) === 'agent');
  const corePkg = facts.find(p => shortName(p.name) === 'core');

  // Check what key functions exist
  const agentFns = new Set(agentPkg?.functions.map(f => f.name) ?? []);
  const agentExports = new Set(agentPkg?.exports.map(e => e.name) ?? []);
  const coreExports = new Set(corePkg?.exports.map(e => e.name) ?? []);

  const lines: string[] = ['sequenceDiagram'];

  // Participants
  lines.push('  participant User');
  if (agentExports.has('runAgentLoop') || agentFns.has('runAgentLoop')) {
    lines.push('  participant AgentLoop');
  }
  // Check for LLM providers
  const hasRemoteLLM = agentExports.has('RemoteLLMProvider');
  const hasWasmProvider = agentExports.has('WasmProvider');
  if (hasRemoteLLM || hasWasmProvider) {
    lines.push('  participant LLMProvider');
  }
  if (coreExports.has('createWebMcpServer') || coreExports.has('McpClient')) {
    lines.push('  participant WebMcpServer');
  }

  lines.push('');

  // Flow
  lines.push('  User->>AgentLoop: message');
  lines.push('  AgentLoop->>LLMProvider: chat(messages, tools)');
  lines.push('  LLMProvider-->>AgentLoop: tool_use blocks');
  lines.push('  AgentLoop->>WebMcpServer: executeTool()');
  lines.push('  WebMcpServer-->>AgentLoop: result');
  lines.push('  AgentLoop-->>User: assistant response');

  // If discovery tools exist, add a note
  if (agentExports.has('buildDiscoveryTools') || agentExports.has('activateServerTools')) {
    lines.push('');
    lines.push('  Note over AgentLoop,WebMcpServer: Lazy tool discovery via<br/>buildDiscoveryTools + activateServerTools');
  }

  // If WASM provider exists, add alternative
  if (hasWasmProvider) {
    lines.push('');
    lines.push('  Note over LLMProvider: RemoteLLMProvider (Claude API)<br/>or WasmProvider (in-browser Gemma)');
  }

  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------------------ */
/*  Diagram 4 — Interfaces principales (classDiagram)                   */
/* ------------------------------------------------------------------ */

function generateInterfacesDiagram(facts: PackageFacts[]): string {
  const lines: string[] = ['classDiagram'];

  // Collect all interfaces across packages
  const allInterfaces: { pkg: string; iface: InterfaceFact }[] = [];
  for (const pkg of facts) {
    for (const iface of pkg.interfaces) {
      allInterfaces.push({ pkg: shortName(pkg.name), iface });
    }
  }

  if (allInterfaces.length === 0) {
    lines.push('  class NoInterfaces {');
    lines.push('    +No interfaces found in facts.json');
    lines.push('  }');
    return lines.join('\n') + '\n';
  }

  for (const { pkg, iface } of allInterfaces) {
    lines.push(`  class ${iface.name} {`);
    lines.push(`    <<interface>>`);
    for (const prop of iface.properties) {
      const opt = prop.optional ? '?' : '';
      const typeStr = truncateType(mermaidEscape(prop.type), 50);
      lines.push(`    +${prop.name}${opt}: ${typeStr}`);
    }
    lines.push('  }');
    lines.push('');
  }

  // Add package annotations as notes
  const pkgGroups = new Map<string, string[]>();
  for (const { pkg, iface } of allInterfaces) {
    if (!pkgGroups.has(pkg)) pkgGroups.set(pkg, []);
    pkgGroups.get(pkg)!.push(iface.name);
  }

  // Add relationships between interfaces if we can infer them
  // (e.g., if a property type references another interface name)
  const ifaceNames = new Set(allInterfaces.map(i => i.iface.name));
  for (const { iface } of allInterfaces) {
    for (const prop of iface.properties) {
      for (const otherName of ifaceNames) {
        if (otherName !== iface.name && prop.type.includes(otherName)) {
          lines.push(`  ${iface.name} --> ${otherName} : ${prop.name}`);
        }
      }
    }
  }

  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */

function main() {
  // Check facts.json exists
  if (!fs.existsSync(FACTS_PATH)) {
    console.error('Error: docs/facts.json not found.');
    console.error('Run npm run docs:facts first.');
    process.exit(1);
  }

  const facts: PackageFacts[] = JSON.parse(fs.readFileSync(FACTS_PATH, 'utf-8'));

  // Create output directory
  if (!fs.existsSync(DIAGRAMS_DIR)) {
    fs.mkdirSync(DIAGRAMS_DIR, { recursive: true });
  }

  // Generate diagrams
  const diagrams: { name: string; filename: string; generator: (f: PackageFacts[]) => string }[] = [
    { name: 'Architecture packages', filename: 'architecture.mmd', generator: generateArchitectureDiagram },
    { name: 'Exports par package', filename: 'exports.mmd', generator: generateExportsDiagram },
    { name: 'Agent flow', filename: 'agent-flow.mmd', generator: generateAgentFlowDiagram },
    { name: 'Interfaces', filename: 'interfaces.mmd', generator: generateInterfacesDiagram },
  ];

  for (const diag of diagrams) {
    console.log(`Generating ${diag.name}...`);
    const content = diag.generator(facts);
    const outPath = path.join(DIAGRAMS_DIR, diag.filename);
    fs.writeFileSync(outPath, content);
    console.log(`  Wrote ${outPath}`);
  }

  console.log(`\nDone. ${diagrams.length} diagrams written to ${DIAGRAMS_DIR}/`);
}

main();
