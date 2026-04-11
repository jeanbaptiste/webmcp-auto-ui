#!/usr/bin/env tsx
/**
 * sync-schemas.ts
 *
 * Extracts `interface Props` from Svelte widget components, converts them to
 * JSON Schema, and injects the result into the `schema:` field of each
 * widget recipe's YAML frontmatter.
 *
 * Usage:
 *   npx tsx scripts/sync-schemas.ts          # update .md files
 *   npx tsx scripts/sync-schemas.ts --check  # CI mode — exit 1 if out of date
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname, '..');
const RECIPES_DIR = path.join(ROOT, 'packages/agent/src/recipes/widgets');

const WIDGET_TO_FILE: Record<string, string> = {
  'stat':          'packages/ui/src/widgets/simple/StatBlock.svelte',
  'kv':            'packages/ui/src/widgets/simple/KVBlock.svelte',
  'list':          'packages/ui/src/widgets/simple/ListBlock.svelte',
  'chart':         'packages/ui/src/widgets/simple/ChartBlock.svelte',
  'alert':         'packages/ui/src/widgets/simple/AlertBlock.svelte',
  'code':          'packages/ui/src/widgets/simple/CodeBlock.svelte',
  'text':          'packages/ui/src/widgets/simple/TextBlock.svelte',
  'actions':       'packages/ui/src/widgets/simple/ActionsBlock.svelte',
  'tags':          'packages/ui/src/widgets/simple/TagsBlock.svelte',
  'stat-card':     'packages/ui/src/widgets/rich/StatCard.svelte',
  'data-table':    'packages/ui/src/widgets/rich/DataTable.svelte',
  'timeline':      'packages/ui/src/widgets/rich/Timeline.svelte',
  'profile':       'packages/ui/src/widgets/rich/ProfileCard.svelte',
  'trombinoscope': 'packages/ui/src/widgets/rich/Trombinoscope.svelte',
  'json-viewer':   'packages/ui/src/widgets/rich/JsonViewer.svelte',
  'hemicycle':     'packages/ui/src/widgets/rich/Hemicycle.svelte',
  'chart-rich':    'packages/ui/src/widgets/rich/Chart.svelte',
  'cards':         'packages/ui/src/widgets/rich/Cards.svelte',
  'grid-data':     'packages/ui/src/widgets/rich/GridData.svelte',
  'sankey':        'packages/ui/src/widgets/rich/Sankey.svelte',
  'map':           'packages/ui/src/widgets/rich/MapView.svelte',
  'd3':            'packages/ui/src/widgets/rich/D3Widget.svelte',
  'js-sandbox':    'packages/ui/src/widgets/rich/JsSandbox.svelte',
  'log':           'packages/ui/src/widgets/rich/LogViewer.svelte',
  'gallery':       'packages/ui/src/widgets/rich/Gallery.svelte',
  'carousel':      'packages/ui/src/widgets/rich/Carousel.svelte',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
}

interface ParsedField {
  name: string;
  optional: boolean;
  typeStr: string;
}

interface ParsedInterface {
  name: string;
  fields: ParsedField[];
}

// ─── Svelte script extraction ────────────────────────────────────────────────

function extractScriptBlock(svelte: string): string {
  const match = svelte.match(/<script\s+lang="ts">([\s\S]*?)<\/script>/);
  return match?.[1] ?? '';
}

// ─── TypeScript interface parser (lightweight, covers our component patterns) ─

/**
 * Finds all `interface Xxx { ... }` blocks in the script, handling nested braces.
 */
function parseAllInterfaces(script: string): ParsedInterface[] {
  const results: ParsedInterface[] = [];
  const normalized = script.replace(/\r\n/g, '\n');

  const ifaceRe = /(?:export\s+)?interface\s+(\w+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = ifaceRe.exec(normalized)) !== null) {
    const name = m[1];
    const startBrace = m.index + m[0].length - 1;
    let depth = 1;
    let i = startBrace + 1;
    while (i < normalized.length && depth > 0) {
      if (normalized[i] === '{') depth++;
      else if (normalized[i] === '}') depth--;
      i++;
    }
    const body = normalized.slice(startBrace + 1, i - 1);
    const fields = parseInterfaceBody(body);
    results.push({ name, fields });
  }
  return results;
}

/**
 * Parses the body of an interface into fields.
 */
function parseInterfaceBody(body: string): ParsedField[] {
  const fields: ParsedField[] = [];
  const entries = splitFields(body);
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const fm = trimmed.match(/^(\w+)(\?)?:\s*(.+)$/s);
    if (!fm) continue;
    fields.push({
      name: fm[1],
      optional: fm[2] === '?',
      typeStr: fm[3].replace(/;$/, '').trim(),
    });
  }
  return fields;
}

/**
 * Split interface body by `;` while respecting nested `{}`, `()`, `<>`.
 */
function splitFields(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '{' || c === '(' || c === '<') depth++;
    else if (c === '}' || c === ')' || c === '>') depth--;
    if (c === ';' && depth === 0) {
      parts.push(current);
      current = '';
    } else if (c === '\n' && depth === 0 && current.trim()) {
      if (/\w+\??:/.test(current)) {
        parts.push(current);
        current = '';
      } else {
        current += c;
      }
    } else {
      current += c;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

// ─── TypeScript type → JSON Schema conversion ───────────────────────────────

function typeToSchema(typeStr: string, ifaceMap: Map<string, ParsedInterface>): JsonSchema {
  const t = typeStr.trim();

  if (t === 'string') return { type: 'string' };
  if (t === 'number') return { type: 'number' };
  if (t === 'boolean') return { type: 'boolean' };
  if (t === 'unknown') return { type: 'object' };

  // String union enum: 'a'|'b'|'c'
  if (/^'[^']*'(\s*\|\s*'[^']*')*$/.test(t)) {
    const values = [...t.matchAll(/'([^']*)'/g)].map(m => m[1]);
    if (values.length >= 1) return { type: 'string', enum: values };
  }

  // Union with mix of string literals and type refs
  if (t.includes('|')) {
    const parts = t.split('|').map(p => p.trim());
    const stringLiterals = parts.filter(p => /^'[^']*'$/.test(p)).map(p => p.slice(1, -1));
    const typeRefs = parts.filter(p => !/^'[^']*'$/.test(p));
    if (typeRefs.length === 0 && stringLiterals.length > 0) {
      return { type: 'string', enum: stringLiterals };
    }
    // Mixed union (e.g. 'up'|'down'|'flat'|StatCardTrend) → string
    if (stringLiterals.length > 0) {
      return { type: 'string' };
    }
  }

  // Tuple array: [string, number][]
  const tupleArrayMatch = t.match(/^\[(.+)\]\[\]$/);
  if (tupleArrayMatch) {
    return { type: 'array', items: { type: 'array' } };
  }

  // Inline object array: { key: string; value: number }[]
  const inlineObjArrayMatch = t.match(/^\{([\s\S]+)\}\[\]$/);
  if (inlineObjArrayMatch) {
    const fields = parseInterfaceBody(inlineObjArrayMatch[1]);
    return { type: 'array', items: fieldsToObjectSchema(fields, ifaceMap) };
  }

  // Simple array: Type[]
  const arrayMatch = t.match(/^(.+)\[\]$/);
  if (arrayMatch) {
    const inner = arrayMatch[1].trim();
    return { type: 'array', items: typeToSchema(inner, ifaceMap) };
  }

  // Record<string, unknown>
  if (/^Record<string,\s*(unknown|any|string|number)>$/.test(t)) {
    return { type: 'object' };
  }

  // Partial<T> — resolve T, keep original required/optional markers
  const partialMatch = t.match(/^Partial<(\w+)>$/);
  if (partialMatch) {
    const iface = ifaceMap.get(partialMatch[1]);
    if (iface) {
      const allOptional = iface.fields.map(f => ({ ...f, optional: true }));
      return fieldsToObjectSchema(allOptional, ifaceMap);
    }
    return { type: 'object' };
  }

  // Named interface reference
  const iface = ifaceMap.get(t);
  if (iface) return fieldsToObjectSchema(iface.fields, ifaceMap);

  // Inline object: { key: string; value: number }
  if (t.startsWith('{') && t.endsWith('}')) {
    const fields = parseInterfaceBody(t.slice(1, -1));
    return fieldsToObjectSchema(fields, ifaceMap);
  }

  return { type: 'object' };
}

function fieldsToObjectSchema(
  fields: ParsedField[],
  ifaceMap: Map<string, ParsedInterface>,
): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const field of fields) {
    // Skip function types (callbacks)
    if (field.typeStr.includes('=>')) continue;
    // Skip HTMLElement types
    if (field.typeStr.includes('HTML')) continue;
    properties[field.name] = typeToSchema(field.typeStr, ifaceMap);
    if (!field.optional) required.push(field.name);
  }

  const schema: JsonSchema = { type: 'object', properties };
  if (required.length > 0) schema.required = required;
  return schema;
}

// ─── Build schema for a widget ───────────────────────────────────────────────

function buildSchemaForWidget(widgetName: string): JsonSchema | null {
  const relPath = WIDGET_TO_FILE[widgetName];
  if (!relPath) {
    console.warn(`  ! No file mapping for widget "${widgetName}"`);
    return null;
  }

  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    console.warn(`  ! File not found: ${relPath}`);
    return null;
  }

  const svelte = fs.readFileSync(absPath, 'utf-8');
  const script = extractScriptBlock(svelte);
  if (!script) {
    console.warn(`  ! No <script lang="ts"> block in ${relPath}`);
    return null;
  }

  const interfaces = parseAllInterfaces(script);
  const ifaceMap = new Map<string, ParsedInterface>();
  for (const iface of interfaces) ifaceMap.set(iface.name, iface);

  const propsIface = ifaceMap.get('Props');
  if (!propsIface) {
    console.warn(`  ! No interface Props in ${relPath}`);
    return null;
  }

  // Filter out callback and generic-unknown fields
  const relevantFields = propsIface.fields.filter(f => {
    if (f.typeStr.includes('=>')) return false;
    if (f.typeStr === 'unknown') return false;
    return true;
  });

  // If there's a single relevant field wrapping Partial<T> or T, unwrap it.
  // Use the ORIGINAL interface's required/optional markers (not the Partial<> wrapper)
  // because the schema describes the data contract for the LLM.
  if (relevantFields.length === 1) {
    const f = relevantFields[0];
    const partialMatch = f.typeStr.match(/^Partial<(\w+)>$/);
    if (partialMatch) {
      const iface = ifaceMap.get(partialMatch[1]);
      if (iface) return fieldsToObjectSchema(iface.fields, ifaceMap);
    }
    const directIface = ifaceMap.get(f.typeStr);
    if (directIface) return fieldsToObjectSchema(directIface.fields, ifaceMap);
  }

  return fieldsToObjectSchema(relevantFields, ifaceMap);
}

// ─── YAML minimal serializer ─────────────────────────────────────────────────

/**
 * Convert JsonSchema to a plain object for YAML serialization,
 * preserving key order: type, required, enum, items, properties.
 */
function schemaToPlain(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  out.type = schema.type;
  if (schema.required && schema.required.length > 0) out.required = schema.required;
  if (schema.enum) out.enum = schema.enum;
  if (schema.items) out.items = schemaToPlain(schema.items);
  if (schema.properties) {
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema.properties)) {
      props[k] = schemaToPlain(v);
    }
    out.properties = props;
  }
  return out;
}

function yamlValue(v: unknown, indent: number): string {
  const pad = '  '.repeat(indent);
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    // Quote strings that contain YAML special characters
    if (/[:#\[\]{},>|&*!%@`]/.test(v) || v.startsWith('- ') || v === '') {
      return `'${v.replace(/'/g, "''")}'`;
    }
    return v;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    // Always use block style for arrays (matches existing .md format)
    return '\n' + v.map(item => {
      if (typeof item === 'object' && item !== null) {
        const objYaml = yamlObject(item as Record<string, unknown>, indent + 2);
        const lines = objYaml.split('\n');
        // First property on same line as dash, rest indented
        return pad + '  - ' + lines[0].trimStart() +
          (lines.length > 1 ? '\n' + lines.slice(1).map(l => pad + '    ' + l.trimStart()).join('\n') : '');
      }
      return pad + '  - ' + String(item);
    }).join('\n');
  }
  if (typeof v === 'object') {
    return '\n' + yamlObject(v as Record<string, unknown>, indent + 1);
  }
  return String(v);
}

function yamlObject(obj: Record<string, unknown>, indent: number): string {
  const pad = '  '.repeat(indent);
  const lines: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    const rendered = yamlValue(val, indent);
    if (rendered.startsWith('\n')) {
      lines.push(`${pad}${key}:${rendered}`);
    } else {
      lines.push(`${pad}${key}: ${rendered}`);
    }
  }
  return lines.join('\n');
}

function schemaToYaml(schema: JsonSchema, indent: number = 0): string {
  return yamlObject(schemaToPlain(schema), indent);
}

// ─── Frontmatter parser / updater ────────────────────────────────────────────

interface Frontmatter {
  raw: string;
  fields: Map<string, string>;
  body: string;
}

function parseFrontmatter(content: string): Frontmatter | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const rawFm = match[1];
  const body = match[2];
  const fields = new Map<string, string>();

  let currentKey = '';
  let currentValue = '';
  for (const line of rawFm.split('\n')) {
    const topLevel = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (topLevel) {
      if (currentKey) fields.set(currentKey, currentValue.trimEnd());
      currentKey = topLevel[1];
      currentValue = topLevel[2];
    } else if (currentKey) {
      currentValue += '\n' + line;
    }
  }
  if (currentKey) fields.set(currentKey, currentValue.trimEnd());

  return { raw: rawFm, fields, body };
}

function rebuildFrontmatter(fm: Frontmatter, schemaYaml: string): string {
  const lines = fm.raw.split('\n');
  const outLines: string[] = [];
  let inSchema = false;
  let schemaInserted = false;

  for (const line of lines) {
    const isTopLevel = /^\w/.test(line);
    if (isTopLevel && inSchema) {
      inSchema = false;
    }
    if (/^schema\s*:/.test(line)) {
      inSchema = true;
      outLines.push(schemaYaml);
      schemaInserted = true;
      continue;
    }
    if (inSchema) continue;
    outLines.push(line);
  }

  if (!schemaInserted) {
    outLines.push(schemaYaml);
  }

  return '---\n' + outLines.join('\n') + '\n---\n' + fm.body;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');
  const customDir = args.find(a => !a.startsWith('-'));
  const recipesDir = customDir ? path.resolve(customDir) : RECIPES_DIR;

  if (!fs.existsSync(recipesDir)) {
    console.log(`Recipes directory not found: ${recipesDir}`);
    console.log('Nothing to do (directory will be created later).');
    process.exit(0);
  }

  const mdFiles = fs.readdirSync(recipesDir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(recipesDir, f));

  if (mdFiles.length === 0) {
    console.log('No .md files found in', recipesDir);
    process.exit(0);
  }

  let dirty = 0;
  let updated = 0;
  let errors = 0;

  for (const mdPath of mdFiles) {
    const relMd = path.relative(ROOT, mdPath);
    const content = fs.readFileSync(mdPath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm) {
      console.warn(`  ! No frontmatter in ${relMd}`);
      errors++;
      continue;
    }

    const widgetName = fm.fields.get('widget')?.trim();
    if (!widgetName) continue; // not a widget recipe

    console.log(`> ${relMd} (widget: ${widgetName})`);

    const schema = buildSchemaForWidget(widgetName);
    if (!schema) {
      errors++;
      continue;
    }

    const schemaYaml = 'schema:\n' + schemaToYaml(schema, 1);
    const newContent = rebuildFrontmatter(fm, schemaYaml);

    if (newContent !== content) {
      dirty++;
      if (checkMode) {
        console.log(`  x OUT OF DATE`);
      } else {
        fs.writeFileSync(mdPath, newContent, 'utf-8');
        updated++;
        console.log(`  + updated`);
      }
    } else {
      console.log(`  . up to date`);
    }
  }

  console.log('');
  if (checkMode) {
    if (dirty > 0) {
      console.log(`${dirty} file(s) out of date. Run \`npx tsx scripts/sync-schemas.ts\` to fix.`);
      process.exit(1);
    }
    console.log('All schemas up to date.');
  } else {
    console.log(`Updated: ${updated}, Skipped: ${mdFiles.length - updated - errors}, Errors: ${errors}`);
  }
}

main();
