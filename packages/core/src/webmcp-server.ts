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

// ---------------------------------------------------------------------------
// Image URL sanitizer — strips hallucinated URLs from widget params
// ---------------------------------------------------------------------------

const VALID_URL_PREFIXES = ['http://', 'https://', 'data:', '/'];
const IMAGE_KEY_PATTERN = /^(src|image|avatar|photo|thumbnail|poster|icon|logo|cover|banner|background)$/i;

/** Recursively scan widget params and nullify image-like fields with invalid URLs. */
function sanitizeImageUrls(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sanitizeImageUrls);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (IMAGE_KEY_PATTERN.test(key) && typeof value === 'string') {
        if (VALID_URL_PREFIXES.some(p => value.startsWith(p))) {
          result[key] = value;
        } else {
          // Invalid image URL — strip it (likely hallucinated)
          // Keep the key but set to undefined so the widget can use its fallback
        }
      } else if (typeof value === 'object' && value !== null) {
        // Special case: avatar as object { src: '...' }
        if (IMAGE_KEY_PATTERN.test(key) && 'src' in (value as Record<string, unknown>)) {
          const srcVal = (value as Record<string, unknown>).src;
          if (typeof srcVal === 'string' && !VALID_URL_PREFIXES.some(p => srcVal.startsWith(p))) {
            // Strip the whole avatar object if src is invalid
            continue;
          }
        }
        result[key] = sanitizeImageUrls(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return obj;
}

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
        description: 'Search available widget recipes by keyword and return matching names with descriptions. Use this as your FIRST step when the user asks to display data visually — it helps you find the right widget type before calling widget_display. Pass a keyword extracted from the user request (e.g. "chart", "table", "map", "profile"). Returns an array of {name, description, group} objects. If no results match, fall back to list_recipes to browse all available widgets.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keyword to filter recipes by name or description, e.g. "chart", "table", "timeline", "map". Case-insensitive. Omit to return all recipes.',
            },
          },
          additionalProperties: false,
        },
        execute: async (params: Record<string, unknown>) => {
          const query = (params.query as string | undefined)?.toLowerCase();
          const all = [...widgets.values()].map(w => ({ name: w.name, description: w.description, group: w.group }));
          return all.filter(w => !query || w.name.includes(query) || w.description.toLowerCase().includes(query));
        },
      },
      {
        name: 'list_recipes',
        description: 'List ALL available widget recipes with their name, description, and group. Use this when search_recipes returned no results, or when the user wants to explore all display capabilities. Returns the complete catalog of widgets — useful for choosing the best visualization when the exact widget type is unclear. Does not accept any parameters.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        execute: async () => {
          return [...widgets.values()].map(w => ({ name: w.name, description: w.description, group: w.group }));
        },
      },
      {
        name: 'get_recipe',
        description: 'Retrieve the full recipe for a specific widget type, including its JSON schema and step-by-step usage instructions. Call this BEFORE calling widget_display to understand the exact parameter structure expected by the widget. Returns {name, description, schema, recipe} where schema is the JSON Schema for params validation and recipe contains markdown instructions. If the widget name is not found, returns an error with the list of available widget names.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Exact widget type name as returned by search_recipes or list_recipes, e.g. "chart-rich", "data-table", "stat-card", "hemicycle". Must match exactly — no partial matches.' },
          },
          required: ['name'],
          additionalProperties: false,
        },
        execute: async (params: Record<string, unknown>) => {
          const widgetName = params.name as string;
          const entry = widgets.get(widgetName);
          if (entry) {
            return { name: entry.name, description: entry.description, schema: entry.inputSchema, recipe: entry.recipe };
          }
          return { error: `Recipe "${widgetName}" not found`, available: [...widgets.keys()] };
        },
      },
      {
        name: 'widget_display',
        // Description is dynamic — rebuilt in layer()
        description: 'Render a widget on the user\'s canvas with the specified type and parameters. Use this tool whenever you need to display data visually — charts, tables, statistics, timelines, maps, galleries, etc. The widget type must match one of the available widget names (use search_recipes or list_recipes first to discover available widgets, then get_recipe to learn the exact schema). Parameters are validated against the widget\'s JSON schema — invalid params will return a validation error with the expected schema. Returns the widget\'s unique ID for later updates via the canvas tool. Do NOT use this tool for plain text responses — use regular text output instead.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The widget type name, e.g. "chart", "stat", "data-table", "timeline", "map", "hemicycle". Must exactly match a registered widget name. Use list_recipes() to see all available widget names.' },
            params: {
              type: 'object',
              description: 'Widget-specific parameters as a JSON object. The structure depends on the widget type — use get_recipe(name) to see the exact JSON schema and examples. For instance, stat expects {label, value}, chart expects {bars}, data-table expects {columns, rows}. Invalid parameters will be rejected with a validation error showing the expected schema.',
              additionalProperties: true,
            },
          },
          required: ['name'],
          additionalProperties: false,
        },
        execute: async (params: Record<string, unknown>) => {
          const widgetName = params.name as string;
          const entry = widgets.get(widgetName);
          if (!entry) {
            return {
              error: `Widget "${widgetName}" not found. Available: ${[...widgets.keys()].join(', ')}`,
            };
          }

          const rawParams = (params.params ?? {}) as Record<string, unknown>;
          const validation = validateJsonSchema(rawParams, entry.inputSchema as JsonSchema);
          if (!validation.valid) {
            return {
              error: 'Validation failed',
              details: validation.errors,
              expected_schema: entry.inputSchema,
            };
          }

          // Sanitize image URLs — strip hallucinated/invalid URLs before sending to UI
          const widgetParams = sanitizeImageUrls(rawParams) as Record<string, unknown>;

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
      if (!builtinTools && widgets.size > 0) {
        ensureBuiltinTools();
      }

      const allTools = [...customTools];

      if (builtinTools) {
        // Rebuild widget_display description with current widget names
        const names = [...widgets.keys()];
        const displayTool = builtinTools.find(t => t.name === 'widget_display')!;
        displayTool.description = `Render a widget on the user's canvas with the specified type and parameters. Use this tool whenever you need to display data visually — charts, tables, statistics, timelines, maps, galleries, etc. The widget type must match one of the available widget names (use search_recipes or get_recipe first to learn the exact schema). Returns the widget's unique ID for later updates via the canvas tool. Do NOT use this tool for plain text responses. Available widgets: ${names.join(', ')}.`;

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
