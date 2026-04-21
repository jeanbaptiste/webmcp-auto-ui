/**
 * Pure serializer: ChatMessage[] → flat [{role, content}] array suitable for
 * tokenizer.apply_chat_template in the transformers.js worker.
 *
 * Extracted from TransformersProvider so it can be unit-tested without
 * spinning up a Web Worker. Tool calls and tool results are rendered as
 * textual spans using the wire format each model family expects:
 *
 *   - Qwen (ChatML):   <tool_call>{json}</tool_call>
 *                      <tool_response>{json}</tool_response>
 *   - Mistral:         [TOOL_CALLS][{json}]
 *                      [TOOL_RESULTS] {json} [/TOOL_RESULTS]
 *   - Gemma:           legacy path (this serializer is not used — see
 *                      buildGemmaPrompt in prompts/gemma4-prompt-builder.ts).
 *
 * The actual role tags (<|im_start|>user\n…<|im_end|>, [INST]…[/INST]) are
 * added by apply_chat_template from the model's baked-in chat_template.
 */
import type { ChatMessage, ContentBlock } from '../types.js';
import { formatToolCall, formatToolResponse } from '../prompts/gemma4-prompt-builder.js';

export type PromptKind = 'gemma' | 'qwen' | 'mistral';

export function serializeMessagesForTemplate(
  messages: ChatMessage[],
  promptKind: PromptKind,
): Array<{ role: string; content: string }> {
  const out: Array<{ role: string; content: string }> = [];
  for (const msg of messages) {
    const role = msg.role; // 'user' | 'assistant' | 'system'
    if (typeof msg.content === 'string') {
      out.push({ role, content: msg.content });
      continue;
    }
    const segments: string[] = [];
    let toolResultBuf: string[] = [];
    const flushToolResults = () => {
      if (toolResultBuf.length === 0) return;
      if (promptKind === 'qwen') {
        for (const tr of toolResultBuf) {
          segments.push(`<tool_response>\n${tr}\n</tool_response>`);
        }
      } else if (promptKind === 'mistral') {
        for (const tr of toolResultBuf) {
          segments.push(`[TOOL_RESULTS] ${tr} [/TOOL_RESULTS]`);
        }
      } else {
        // Gemma path — kept for defensive completeness; main code uses
        // buildGemmaPrompt instead.
        for (const tr of toolResultBuf) segments.push(formatToolResponse(tr));
      }
      toolResultBuf = [];
    };
    for (const block of msg.content as ContentBlock[]) {
      if (block.type === 'text') {
        segments.push(block.text);
      } else if (block.type === 'tool_use') {
        if (promptKind === 'qwen') {
          segments.push(`<tool_call>\n${JSON.stringify({ name: block.name, arguments: block.input })}\n</tool_call>`);
        } else if (promptKind === 'mistral') {
          segments.push(`[TOOL_CALLS][${JSON.stringify({ name: block.name, arguments: block.input })}]`);
        } else {
          segments.push(formatToolCall(block.name, block.input));
        }
      } else if (block.type === 'tool_result') {
        toolResultBuf.push(block.content);
      }
      // 'image' blocks are not reachable here: vision turns go through the
      // legacy `prompt` path in TransformersProvider.chat().
    }
    flushToolResults();
    // Promote pure-tool-result turns: Qwen uses the 'tool' role, Mistral
    // keeps 'user' (the template wraps tool results inside a user turn).
    const onlyToolResult = (msg.content as ContentBlock[]).every(b => b.type === 'tool_result');
    const effectiveRole = onlyToolResult && role === 'user'
      ? (promptKind === 'qwen' ? 'tool' : 'user')
      : role;
    out.push({ role: effectiveRole, content: segments.join('\n') });
  }
  return out;
}
