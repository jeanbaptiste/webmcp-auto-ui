import { describe, it, expect } from 'vitest';
import { serializeMessagesForTemplate } from '../src/providers/transformers-serialize.js';
import type { ChatMessage } from '../src/types.js';

// Regression coverage for the commit e47874c migration: Qwen/Mistral prompts
// now flow through tokenizer.apply_chat_template, and the serializer maps
// ChatMessage[] tool_use / tool_result blocks into the wire spans each family
// expects (ChatML <tool_call>/<tool_response> for Qwen, [TOOL_CALLS]/
// [TOOL_RESULTS] for Mistral).

describe('serializeMessagesForTemplate — promptKind="qwen"', () => {
  it('(1) plain user text turn passes through verbatim', () => {
    const msgs: ChatMessage[] = [
      { role: 'user', content: 'hello' },
    ];
    const out = serializeMessagesForTemplate(msgs, 'qwen');
    expect(out).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('(2) assistant tool_use renders as <tool_call>…</tool_call>', () => {
    const msgs: ChatMessage[] = [
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'call_1', name: 'search', input: { q: 'recipes' } },
        ],
      },
    ];
    const out = serializeMessagesForTemplate(msgs, 'qwen');
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('assistant');
    expect(out[0].content).toBe(
      '<tool_call>\n{"name":"search","arguments":{"q":"recipes"}}\n</tool_call>',
    );
  });

  it('(3) user turn with only tool_result is promoted to role "tool" and wrapped in <tool_response>', () => {
    const msgs: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'call_1', content: '{"hits":3}' },
        ],
      },
    ];
    const out = serializeMessagesForTemplate(msgs, 'qwen');
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('tool');
    expect(out[0].content).toBe('<tool_response>\n{"hits":3}\n</tool_response>');
  });

  it('(4) mixed text + tool_result in a user turn keeps role "user" and joins segments', () => {
    const msgs: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Here you go:' },
          { type: 'tool_result', tool_use_id: 'call_1', content: '{"ok":true}' },
        ],
      },
    ];
    const out = serializeMessagesForTemplate(msgs, 'qwen');
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('user');
    expect(out[0].content).toBe(
      'Here you go:\n<tool_response>\n{"ok":true}\n</tool_response>',
    );
  });
});

describe('serializeMessagesForTemplate — promptKind="mistral"', () => {
  it('(5) assistant tool_use renders as [TOOL_CALLS][…]', () => {
    const msgs: ChatMessage[] = [
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'call_1', name: 'search', input: { q: 'recipes' } },
        ],
      },
    ];
    const out = serializeMessagesForTemplate(msgs, 'mistral');
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('assistant');
    expect(out[0].content).toBe(
      '[TOOL_CALLS][{"name":"search","arguments":{"q":"recipes"}}]',
    );
  });

  it('(6) user turn with only tool_result keeps role "user" and wraps in [TOOL_RESULTS] … [/TOOL_RESULTS]', () => {
    const msgs: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'call_1', content: '{"hits":3}' },
        ],
      },
    ];
    const out = serializeMessagesForTemplate(msgs, 'mistral');
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('user');
    expect(out[0].content).toBe('[TOOL_RESULTS] {"hits":3} [/TOOL_RESULTS]');
  });
});
