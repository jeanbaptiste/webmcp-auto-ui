// Gemma 4 native format: inline tool declarations, tool-call / tool-response
// transport, and the 3-STEP minimalist system prompt.

import type { ChatMessage, ContentBlock, ProviderTool } from '../types.js';
import type { PromptRefs } from './tool-refs.js';

/** Format a value in Gemma 4 native syntax. */
export function gemmaValue(v: unknown): string {
  const q = '<|"|>';
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map(i => gemmaValue(i)).join(',')}]`;
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}:${gemmaValue(val)}`);
    return `{${entries.join(',')}}`;
  }
  return `${q}${String(v)}${q}`;
}

/** Format a tool declaration in Gemma 4 native syntax. */
export function formatGemmaToolDeclaration(tool: ProviderTool): string {
  const q = '<|"|>';
  let decl = `<|tool>declaration:${tool.name}{\n`;
  decl += `  description:${q}${tool.description}${q}`;

  const schema = tool.input_schema;
  if (schema?.properties) {
    const props = schema.properties as Record<string, { description?: string; type?: string; enum?: string[]; format?: string; default?: unknown }>;
    decl += `,\n  parameters:{\n    properties:{\n`;

    const propEntries = Object.entries(props);
    for (let i = 0; i < propEntries.length; i++) {
      const [key, val] = propEntries[i];
      decl += `      ${key}:{`;
      const parts: string[] = [];
      if (val.description) parts.push(`description:${q}${val.description}${q}`);
      let inferredType = val.type;
      if (!inferredType) {
        const descLower = (val.description ?? '').toLowerCase();
        if (descLower.includes('objet') || descLower.includes('object') || descLower.includes('parameter') || descLower.includes('paramètre') || key === 'params') {
          inferredType = 'object';
        } else {
          inferredType = 'string';
        }
      }
      parts.push(`type:${q}${inferredType.toUpperCase()}${q}`);
      if (val.enum) parts.push(`enum:[${val.enum.map(e => `${q}${e}${q}`).join(',')}]`);
      if (val.format) parts.push(`format:${q}${val.format}${q}`);
      if (val.default !== undefined) parts.push(`default:${gemmaValue(val.default)}`);
      decl += parts.join(',');
      decl += `}${i < propEntries.length - 1 ? ',' : ''}\n`;
    }

    decl += `    }`;
    if (schema.required && Array.isArray(schema.required)) {
      decl += `,\n    required:[${(schema.required as string[]).map(r => `${q}${r}${q}`).join(',')}]`;
    }
    decl += `,\n    type:${q}OBJECT${q}\n  }`;
  }

  decl += `\n}<tool|>`;
  return decl;
}

/** Format a tool call in Gemma 4 native syntax. */
export function formatToolCall(name: string, input: Record<string, unknown>): string {
  const entries = Object.entries(input ?? {})
    .map(([k, v]) => `${k}:${gemmaValue(v)}`);
  return `<|tool_call>call:${name}{${entries.join(',')}}<tool_call|>`;
}

/** Format a tool response in Gemma 4 native syntax. */
export function formatToolResponse(content: string): string {
  try {
    JSON.parse(content);
    return `<|tool_response>response:${content}<tool_response|>`;
  } catch {
    return `<|tool_response>response:<|"|>${content}<|"|><tool_response|>`;
  }
}

/** Build the Gemma 3-STEP system prompt (tool decls embedded inline). */
export function buildGemma4Prompt(refs: PromptRefs): string {
  const { listRecipesByCat, searchRecipesByCat, getRecipesByCat, actionTools, listTools, searchTools } = refs;

  const dataListSearch = [
    ...listRecipesByCat.data,
    ...searchRecipesByCat.data,
  ].join('\n');
  const displayListSearch = [
    ...listRecipesByCat.display,
    ...searchRecipesByCat.display,
  ].join('\n');
  const allGetRecipes = [
    ...getRecipesByCat.data,
    ...getRecipesByCat.display,
  ].join('\n');

  return `Route: DATA (fetch) or DISPLAY (render). Greetings → chat.

STEP 1 — List or search a recipe.
DATA:
${dataListSearch}
DISPLAY:
${displayListSearch}
The tool results are for you, not for the user. Pick the best match and go to STEP 2. Never ask the user to choose.

STEP 2 — Fetch the recipe.
${allGetRecipes}

STEP 3 — Execute using the schema from STEP 2.
- Data: follow the recipe (SQL / FTS / script).
- Display: call widget_display(name, params).
${actionTools.join('\n')}
If no recipe fits, use a tool directly:
${listTools.join('\n')}
${searchTools.join('\n')}
Only use data returned by tools or given by the user. Never fabricate.

Reply: one-line summary + result.`;
}

export interface BuildGemmaPromptInput {
  systemPrompt?: string;
  messages?: ChatMessage[];
}

/** Build the final Gemma 4 wire-format prompt (turns + inline tool_call/response). */
export function buildGemmaPrompt(input: BuildGemmaPromptInput): string {
  const { systemPrompt, messages = [] } = input;

  const parts: string[] = [];

  if (systemPrompt) {
    parts.push(`<|turn>system\n${systemPrompt}\n<turn|>`);
  }

  for (const msg of messages) {
    const role: 'model' | 'user' | 'system' =
      msg.role === 'assistant' ? 'model' : msg.role === 'system' ? 'system' : 'user';

    let segments: string[];
    let toolResultOnly = false;
    if (typeof msg.content === 'string') {
      segments = [msg.content];
    } else {
      segments = [];
      const blocks = msg.content as ContentBlock[];
      for (const block of blocks) {
        if (block.type === 'text') {
          segments.push((block as { type: 'text'; text: string }).text);
        } else if (block.type === 'tool_use') {
          const b = block as { type: 'tool_use'; name: string; input: Record<string, unknown> };
          segments.push(formatToolCall(b.name, b.input));
        } else if (block.type === 'tool_result') {
          const b = block as { type: 'tool_result'; tool_use_id: string; content: string };
          segments.push(formatToolResponse(b.content));
        }
      }
      toolResultOnly = blocks.length > 0 && blocks.every(b => b.type === 'tool_result');
    }
    if (segments.length === 0) continue;

    const prev = parts[parts.length - 1];
    if (toolResultOnly && role === 'user' && prev?.startsWith('<|turn>model\n')) {
      const body = prev.slice(0, -'<turn|>'.length);
      parts[parts.length - 1] = `${body}${segments.join('')}\n<turn|>`;
    } else {
      parts.push(`<|turn>${role}\n${segments.join('\n')}<turn|>`);
    }
  }
  parts.push('<|turn>model\n');
  return parts.join('\n');
}
