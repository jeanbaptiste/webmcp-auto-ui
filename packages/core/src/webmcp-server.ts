// ---------------------------------------------------------------------------
// @webmcp-auto-ui/core — WebMCP Server
// A WebMCP server exposes tools and widget recipes for local UI rendering.
// Symmetric to MCP (remote data) — WebMCP handles display/interaction.
// ---------------------------------------------------------------------------

import { validateJsonSchema } from './validate.js';
import type { JsonSchema } from './types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WebMcpServerOptions {
  description: string;
}

export interface WebMcpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

/** A vanilla renderer: receives a container + data, optionally returns a cleanup function. */
export type WidgetRenderer =
  | ((container: HTMLElement, data: Record<string, unknown>) => void | (() => void))
  | unknown; // framework component (Svelte, React, etc.)

export interface WidgetEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  recipe: string;
  renderer: WidgetRenderer;
  group?: string;
  /** True when the renderer is a plain function (not a framework component). */
  vanilla: boolean;
}

export interface WebMcpServer {
  readonly name: string;
  readonly description: string;

  registerWidget(recipeMarkdown: string, renderer: WidgetRenderer): void;
  addTool(tool: WebMcpToolDef): void;

  layer(): {
    protocol: 'webmcp';
    serverName: string;
    description: string;
    tools: WebMcpToolDef[];
  };

  getWidget(name: string): WidgetEntry | undefined;
  listWidgets(): WidgetEntry[];
}

// ---------------------------------------------------------------------------
// Frontmatter parser
// ---------------------------------------------------------------------------

export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>;
  body: string;
}

/**
 * Parse a markdown file with YAML frontmatter (--- delimited).
 * Supports: scalars, nested objects (indentation), arrays (- item), inline values.
 * No external YAML dependency.
 */
export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const trimmed = markdown.trimStart();
  if (!trimmed.startsWith('---\n') && !trimmed.startsWith('---\r\n')) {
    return { frontmatter: {}, body: markdown };
  }

  const endIdx = trimmed.indexOf('\n---', 3);
  if (endIdx === -1) {
    return { frontmatter: {}, body: markdown };
  }

  const yamlBlock = trimmed.slice(4, endIdx); // skip opening "---\n"
  const body = trimmed.slice(endIdx + 4).replace(/^\r?\n/, ''); // skip closing "---\n" or "---\r\n"

  const frontmatter = parseYaml(yamlBlock);
  return { frontmatter, body };
}

// ---------------------------------------------------------------------------
// Minimal YAML parser
// ---------------------------------------------------------------------------

interface YamlLine {
  indent: number;
  raw: string;
  content: string; // trimmed
}

function tokenize(yaml: string): YamlLine[] {
  return yaml.split('\n').map(raw => {
    const match = raw.match(/^(\s*)/);
    const indent = match ? match[1].length : 0;
    return { indent, raw, content: raw.trim() };
  }).filter(l => l.content !== '' && !l.content.startsWith('#'));
}

function parseYaml(yaml: string): Record<string, unknown> {
  const lines = tokenize(yaml);
  const [result] = parseObject(lines, 0, 0);
  return result;
}

/**
 * Parse an object starting at `start` with minimum indentation `minIndent`.
 * Returns [parsed object, next line index].
 */
function parseObject(
  lines: YamlLine[],
  start: number,
  minIndent: number,
): [Record<string, unknown>, number] {
  const obj: Record<string, unknown> = {};
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < minIndent) break;

    // key: value
    const kvMatch = line.content.match(/^([^:]+?):\s*(.*)?$/);
    if (!kvMatch) { i++; continue; }

    const key = kvMatch[1].trim();
    const valuePart = (kvMatch[2] ?? '').trim();

    if (valuePart !== '') {
      // Inline value
      obj[key] = parseScalar(valuePart);
      i++;
    } else {
      // Block value — look ahead to determine if array or nested object
      if (i + 1 < lines.length && lines[i + 1].indent > line.indent) {
        const childIndent = lines[i + 1].indent;
        if (lines[i + 1].content.startsWith('- ')) {
          const [arr, next] = parseArray(lines, i + 1, childIndent);
          obj[key] = arr;
          i = next;
        } else {
          const [nested, next] = parseObject(lines, i + 1, childIndent);
          obj[key] = nested;
          i = next;
        }
      } else {
        obj[key] = null;
        i++;
      }
    }
  }

  return [obj, i];
}

/**
 * Parse an array starting at `start` with items at `minIndent`.
 */
function parseArray(
  lines: YamlLine[],
  start: number,
  minIndent: number,
): [unknown[], number] {
  const arr: unknown[] = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < minIndent) break;
    if (!line.content.startsWith('- ')) break;

    const itemContent = line.content.slice(2).trim();

    // Check if this is a mapping item (- key: value on same line, possibly with children)
    const kvMatch = itemContent.match(/^([^:]+?):\s*(.*)?$/);
    if (kvMatch) {
      // It's a mapping starting on the dash line
      const firstKey = kvMatch[1].trim();
      const firstVal = (kvMatch[2] ?? '').trim();
      const itemObj: Record<string, unknown> = {};
      itemObj[firstKey] = firstVal !== '' ? parseScalar(firstVal) : null;

      // Collect remaining keys of this mapping (indented deeper than the dash)
      i++;
      const childIndent = line.indent + 2; // standard: items indented 2 past dash
      while (i < lines.length && lines[i].indent >= childIndent && !lines[i].content.startsWith('- ')) {
        const childKv = lines[i].content.match(/^([^:]+?):\s*(.*)?$/);
        if (childKv) {
          const ck = childKv[1].trim();
          const cv = (childKv[2] ?? '').trim();
          if (cv !== '') {
            itemObj[ck] = parseScalar(cv);
          } else if (i + 1 < lines.length && lines[i + 1].indent > lines[i].indent) {
            const nextIndent = lines[i + 1].indent;
            if (lines[i + 1].content.startsWith('- ')) {
              const [subArr, next] = parseArray(lines, i + 1, nextIndent);
              itemObj[ck] = subArr;
              i = next;
              continue;
            } else {
              const [subObj, next] = parseObject(lines, i + 1, nextIndent);
              itemObj[ck] = subObj;
              i = next;
              continue;
            }
          } else {
            itemObj[ck] = null;
          }
        }
        i++;
      }
      arr.push(itemObj);
    } else {
      // Simple scalar item
      arr.push(parseScalar(itemContent));
      i++;
    }
  }

  return [arr, i];
}

/**
 * Parse a scalar YAML value: numbers, booleans, null, inline objects/arrays, or strings.
 */
function parseScalar(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;

  // Quoted string
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Inline JSON-style object { key: val, ... }
  if (value.startsWith('{') && value.endsWith('}')) {
    return parseInlineObject(value);
  }

  // Inline array [a, b, c]
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map(s => parseScalar(s.trim()));
  }

  // Number
  const num = Number(value);
  if (!isNaN(num) && value !== '') return num;

  return value;
}

/**
 * Parse inline YAML object like { type: string, description: Some text }
 */
function parseInlineObject(value: string): Record<string, unknown> {
  const inner = value.slice(1, -1).trim();
  const obj: Record<string, unknown> = {};
  // Split on ", " but only at top level (no nested braces handling needed for our use case)
  const parts = inner.split(/,\s*/);
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;
    const k = part.slice(0, colonIdx).trim();
    const v = part.slice(colonIdx + 1).trim();
    obj[k] = parseScalar(v);
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Mount helper — framework-agnostic widget mounting
// ---------------------------------------------------------------------------

/**
 * Mount a widget into a DOM container by searching registered servers.
 * If the renderer is a function (vanilla renderer), it is called directly.
 * Returns an optional cleanup function.
 * Falls back to a text placeholder if no server provides the widget.
 */
export function mountWidget(
  container: HTMLElement,
  type: string,
  data: Record<string, unknown>,
  servers: WebMcpServer[],
): (() => void) | void {
  for (const server of servers) {
    const widget = server.getWidget(type);
    if (widget?.renderer && widget.vanilla) {
      return (widget.renderer as (container: HTMLElement, data: Record<string, unknown>) => void | (() => void))(container, data);
    }
  }
  container.textContent = `[${type}]`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWebMcpServer(
  name: string,
  options: WebMcpServerOptions,
): WebMcpServer {
  const widgets = new Map<string, WidgetEntry>();
  const customTools: WebMcpToolDef[] = [];
  let builtinTools: WebMcpToolDef[] | null = null;

  function generateId(): string {
    return 'w_' + Math.random().toString(36).slice(2, 8);
  }

  /** Lazily create the 3 built-in tools on first widget registration. */
  function ensureBuiltinTools(): void {
    if (builtinTools) return;

    builtinTools = [
      {
        name: 'search_recipes',
        description: 'List available widget recipes with their descriptions.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Optional search term to filter recipes',
            },
          },
        },
        execute: async (params: Record<string, unknown>) => {
          const query = (params.query as string | undefined)?.toLowerCase();
          const results = [...widgets.values()]
            .filter(w => !query || w.name.includes(query) || w.description.toLowerCase().includes(query))
            .map(w => ({ name: w.name, description: w.description, group: w.group }));
          return results;
        },
      },
      {
        name: 'get_recipe',
        description: 'Get the full recipe for a widget: JSON schema + usage instructions.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Widget name' },
          },
          required: ['name'],
        },
        execute: async (params: Record<string, unknown>) => {
          const widgetName = params.name as string;
          const entry = widgets.get(widgetName);
          if (!entry) {
            return { error: `Widget "${widgetName}" not found. Available: ${[...widgets.keys()].join(', ')}` };
          }
          return {
            name: entry.name,
            description: entry.description,
            schema: entry.inputSchema,
            recipe: entry.recipe,
          };
        },
      },
      {
        name: 'widget_display',
        // Description is dynamic — rebuilt in layer()
        description: 'Display a widget on the canvas.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Widget name' },
            params: {
              type: 'object',
              description: 'Widget parameters (call get_recipe for the schema)',
            },
          },
          required: ['name'],
        },
        execute: async (params: Record<string, unknown>) => {
          const widgetName = params.name as string;
          const entry = widgets.get(widgetName);
          if (!entry) {
            return {
              error: `Widget "${widgetName}" not found. Available: ${[...widgets.keys()].join(', ')}`,
            };
          }

          const widgetParams = (params.params ?? {}) as Record<string, unknown>;
          const validation = validateJsonSchema(widgetParams, entry.inputSchema as JsonSchema);
          if (!validation.valid) {
            return {
              error: 'Validation failed',
              details: validation.errors,
              expected_schema: entry.inputSchema,
            };
          }

          return { widget: widgetName, data: widgetParams, id: generateId() };
        },
      },
    ];
  }

  const server: WebMcpServer = {
    get name() { return name; },
    get description() { return options.description; },

    registerWidget(recipeMarkdown: string, renderer: WidgetRenderer): void {
      const { frontmatter, body } = parseFrontmatter(recipeMarkdown);

      const widgetName = frontmatter.widget as string | undefined;
      if (!widgetName) {
        throw new Error('Recipe frontmatter must include a "widget" field.');
      }

      const schema = frontmatter.schema as Record<string, unknown> | undefined;
      if (!schema) {
        throw new Error(`Recipe "${widgetName}" frontmatter must include a "schema" field.`);
      }

      const entry: WidgetEntry = {
        name: widgetName,
        description: (frontmatter.description as string) ?? '',
        inputSchema: schema,
        recipe: body,
        renderer,
        group: frontmatter.group as string | undefined,
        vanilla: typeof renderer === 'function',
      };

      widgets.set(widgetName, entry);
      ensureBuiltinTools();
    },

    addTool(tool: WebMcpToolDef): void {
      customTools.push(tool);
    },

    layer() {
      const allTools = [...customTools];

      if (builtinTools) {
        // Rebuild widget_display description with current widget names
        const names = [...widgets.keys()];
        const displayTool = builtinTools.find(t => t.name === 'widget_display')!;
        displayTool.description = `Display a widget on the canvas. Available widgets: ${names.join(', ')}.`;

        allTools.push(...builtinTools);
      }

      return {
        protocol: 'webmcp' as const,
        serverName: name,
        description: options.description,
        tools: allTools,
      };
    },

    getWidget(widgetName: string): WidgetEntry | undefined {
      return widgets.get(widgetName);
    },

    listWidgets(): WidgetEntry[] {
      return [...widgets.values()];
    },
  };

  return server;
}
