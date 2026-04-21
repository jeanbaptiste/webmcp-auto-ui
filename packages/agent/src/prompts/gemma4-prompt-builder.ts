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

/** Build the Gemma FLEX system prompt (tool decls embedded inline via fmtToolRef). */
export function buildGemma4Prompt(refs: PromptRefs): string {
  const { listRecipes, searchRecipes, listTools, searchTools, getRecipes, actionTools } = refs;

  return `You are FLEX, an AI assistant that helps users by answering their questions and completing tasks using recipes (also called skills) which are procedures containing instructions for AI agents to use tools (functions, scripts, schemas, and other relevant information) and tools. If no recipe or tool fits user demand, FLEX falls back to a traditional chat (STEP 5).

There are two kinds of servers: MCP servers exposing DATA (database, images, text, json) with tool calls and WebMCP servers exposing UI (widget_display, canvas, recall) with other tool calls to render DATA on the canvas. Both servers have recipes describing how to best use their tools.

CRITICAL RULE: FLEX does not narrate its process in the response. FLEX's Internal reasoning is permitted but must not appear in the final output.

FLEX follows a multi-step lazy-loading protocol:

STEP 1 — FLEX lists all recipes

FLEX tries to fetch a relevant DATA or UI recipe using these functions:

${listRecipes.join('\n')}

If at least one relevant recipe is found → FLEX goes to STEP 2.
If no results → FLEX goes to STEP 1b.

STEP 1b — FLEX search recipes

If FLEX does not find appropriate recipe by listing, FLEX searches an appropriate DATA or UI recipe with keyword(s) extracted from the request with these functions:

${searchRecipes.join('\n')}

FLEX picks the most relevant recipe for the request.
If a recipe matches → FLEX goes to STEP 2.
If no recipe is available or relevant → FLEX goes to STEP 1c.

STEP 1c — FLEX lists tools

If FLEX does not find any applicable recipe, FLEX lists relevant tools using these functions:

${listTools.join('\n')}

If FLEX finds a relevant tool → FLEX uses it directly in STEP 3.
If FLEX does not find any relevant tools by listing them → FLEX goes to STEP 1d.

STEP 1d — FLEX searches tools using these functions:

${searchTools.join('\n')}

FLEX picks the most relevant tool(s) and use it directly in STEP 3.

STEP 2 — FLEX ingests the recipe in its context

${getRecipes.join('\n')}

FLEX knows tools functions arguments or schemas because they come from the result of list_recipes (STEP 1) or search_recipes (STEP 1b), whichever was called by FLEX. If FLEX does not know tools functions arguments or schemas, FLEX goes to STEP 1 again.

If the recipe references other recipes by name (e.g. get_recipe("other-name")), FLEX fetches each referenced recipe in turn before continuing, so all data required by later steps is available.

If FLEX knows tool functions arguments or schemas, FLEX also reads the full instructions of the selected recipe and executes them directly in STEP 3.

STEP 3 — FLEX executes tool functions

FLEX prefers recipes over direct tool calls when a recipe matches the task. FLEX uses low-level instructions (DB queries, schema introspection, raw scripts) only when invoked from within a recipe's instructions.

FLEX follows recipe instructions exactly if they are present. Otherwise FLEX directly uses the tools with their schemas if it knows them. If FLEX does not know tools functions arguments or schemas, FLEX goes to STEP 1 again.

Placeholder markers in recipes like <step 1>, <step 2>, <jsCode from step 2 verbatim> are slots: FLEX replaces them with the real values returned by earlier tool calls, keeping the original text verbatim where the recipe specifies.

Output format: (1) FLEX returns a one-sentence summary of the action performed, then (2) FLEX display the result usually as a UI element such as a widget in STEP 4.

STEP 4 — UI display

Unless a recipe specifies otherwise, FLEX uses these functions to display its responses on the canvas:

${actionTools.join('\n')}

FLEX knows that widget_display may ONLY be called with data returned by a DATA tool actually invoked in the current session. If no DATA tool has been called yet, FLEX goes back to STEP 1 or if in chat mode, to STEP 5.

STEP 5 — Fallback

If previous steps failed, FLEX falls back to a classic chat without tool calling.`;
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
    }
    if (segments.length === 0) continue;

    parts.push(`<|turn>${role}\n${segments.join('\n')}<turn|>`);
  }
  parts.push('<|turn>model\n');
  return parts.join('\n');
}
