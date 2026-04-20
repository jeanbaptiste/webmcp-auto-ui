// Dispatcher: collect refs once, route to provider-specific template.

import { collectPromptRefs } from './tool-refs.js';
import { buildClaudePrompt } from './claude-prompt-builder.js';
import { buildGemma4Prompt } from './gemma4-prompt-builder.js';
import { buildQwenPrompt } from './qwen-prompt-builder.js';
import { buildMistralPrompt } from './mistral-prompt-builder.js';
import { toolAliasMap, type ProviderKind, type ToolLayer } from '../tool-layers.js';

export type { PromptRefs } from './tool-refs.js';
export { collectPromptRefs } from './tool-refs.js';
export { buildClaudePrompt } from './claude-prompt-builder.js';
export {
  buildGemma4Prompt,
  buildGemmaPrompt,
  formatGemmaToolDeclaration,
  formatToolCall,
  formatToolResponse,
  gemmaValue,
} from './gemma4-prompt-builder.js';
export type { BuildGemmaPromptInput } from './gemma4-prompt-builder.js';
export { buildQwenPrompt } from './qwen-prompt-builder.js';
export { buildMistralPrompt } from './mistral-prompt-builder.js';

export interface SystemPromptResult {
  prompt: string;
  aliasMap: Map<string, string>;
}

export function buildSystemPromptWithAliases(
  layers: ToolLayer[],
  options: { providerKind?: ProviderKind } = {},
): SystemPromptResult {
  const kind = options.providerKind ?? 'generic';
  const refs = collectPromptRefs(layers, kind);
  let prompt: string;
  switch (kind) {
    case 'gemma': prompt = buildGemma4Prompt(refs); break;
    case 'qwen': prompt = buildQwenPrompt(refs); break;
    case 'mistral': prompt = buildMistralPrompt(refs); break;
    default: prompt = buildClaudePrompt(refs);
  }
  return { prompt, aliasMap: refs.aliasMap };
}

/** Backward-compat wrapper — also populates the deprecated global toolAliasMap. */
export function buildSystemPrompt(
  layers: ToolLayer[],
  options?: { providerKind?: ProviderKind },
): string {
  const { prompt, aliasMap } = buildSystemPromptWithAliases(layers, options);
  toolAliasMap.clear();
  for (const [k, v] of aliasMap) toolAliasMap.set(k, v);
  return prompt;
}
