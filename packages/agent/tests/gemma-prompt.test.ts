import { describe, it, expect } from 'vitest';
import { WasmProvider, buildGemmaPrompt } from '../src/providers/wasm.js';
import { formatGemmaToolDeclaration, gemmaValue } from '../src/tool-layers.js';
import type { ProviderTool, ChatMessage, ContentBlock } from '../src/types.js';

describe('formatGemmaToolDeclaration', () => {
  const tool: ProviderTool = {
    name: 'tricoteuses_data_search_recipes',
    description: 'Search recipes by keyword',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword to search for' },
      },
      required: ['query'],
    },
  };

  it('produces <|tool>declaration:NAME{...}<tool|> wrapper', () => {
    const decl = formatGemmaToolDeclaration(tool);
    expect(decl.startsWith('<|tool>declaration:tricoteuses_data_search_recipes{')).toBe(true);
    expect(decl.endsWith('}<tool|>')).toBe(true);
  });

  it('uses <|"|> as string delimiters', () => {
    const decl = formatGemmaToolDeclaration(tool);
    expect(decl).toContain('<|"|>Search recipes by keyword<|"|>');
    expect(decl).toContain('<|"|>query<|"|>');
  });

  it('emits types in UPPER case', () => {
    const decl = formatGemmaToolDeclaration(tool);
    expect(decl).toContain('type:<|"|>STRING<|"|>');
    expect(decl).toContain('type:<|"|>OBJECT<|"|>');
    expect(decl).not.toMatch(/type:<\|"\|>string<\|"\|>/);
  });

  it('emits required list with <|"|>-quoted names', () => {
    const decl = formatGemmaToolDeclaration(tool);
    expect(decl).toContain('required:[<|"|>query<|"|>]');
  });
});

describe('gemmaValue', () => {
  it('wraps strings in <|"|> delimiters', () => {
    expect(gemmaValue('hello')).toBe('<|"|>hello<|"|>');
  });
  it('leaves numbers/booleans/null bare', () => {
    expect(gemmaValue(42)).toBe('42');
    expect(gemmaValue(true)).toBe('true');
    expect(gemmaValue(null)).toBe('null');
  });
  it('serializes nested objects and arrays', () => {
    expect(gemmaValue({ a: 1, b: 'x' })).toBe('{a:1,b:<|"|>x<|"|>}');
    expect(gemmaValue([1, 'x'])).toBe('[1,<|"|>x<|"|>]');
  });
});

describe('buildGemmaPrompt', () => {
  it('produces <|turn>system...<turn|> + <|turn>user...<turn|> + open <|turn>model\\n', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
    const prompt = buildGemmaPrompt({ systemPrompt: 'SYS', messages });
    expect(prompt).toContain('<|turn>system\nSYS\n<turn|>');
    expect(prompt).toContain('<|turn>user\nHello<turn|>');
    expect(prompt.endsWith('<|turn>model\n')).toBe(true);
  });

  it('serializes assistant role as <|turn>model', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Q' },
      { role: 'assistant', content: 'A' },
    ];
    const prompt = buildGemmaPrompt({ messages });
    expect(prompt).toContain('<|turn>user\nQ<turn|>');
    expect(prompt).toContain('<|turn>model\nA<turn|>');
  });

  it('serializes tool_use blocks as <|tool_call>call:...<tool_call|>', () => {
    const blocks: ContentBlock[] = [
      { type: 'tool_use', id: 'tu1', name: 'search', input: { query: 'cats' } },
    ];
    const prompt = buildGemmaPrompt({ messages: [{ role: 'assistant', content: blocks }] });
    expect(prompt).toContain('<|tool_call>call:search{query:<|"|>cats<|"|>}<tool_call|>');
  });

  it('resolves tool_result via tool_use name carried by prior tool_use block', () => {
    const blocks: ContentBlock[] = [
      { type: 'tool_use', id: 'tu1', name: 'search', input: {} },
    ];
    const resultBlocks: ContentBlock[] = [
      { type: 'tool_result', tool_use_id: 'tu1', content: 'ok' },
    ];
    const prompt = buildGemmaPrompt({
      messages: [
        { role: 'assistant', content: blocks },
        { role: 'user', content: resultBlocks },
      ],
    });
    expect(prompt).toContain('<|tool_response>response:search{result:<|"|>ok<|"|>}<tool_response|>');
  });
});

describe('WasmProvider.formatToolCall', () => {
  it('produces Gemma-native call syntax', () => {
    const out = WasmProvider.formatToolCall('foo', { a: 1, b: 'x' });
    expect(out).toBe('<|tool_call>call:foo{a:1,b:<|"|>x<|"|>}<tool_call|>');
  });
});

describe('WasmProvider.formatToolResponse', () => {
  it('wraps plain-string results with {result:<|"|>...<|"|>}', () => {
    const out = WasmProvider.formatToolResponse('foo', 'raw text');
    expect(out).toBe('<|tool_response>response:foo{result:<|"|>raw text<|"|>}<tool_response|>');
  });

  it('serializes JSON-parseable content via gemmaValue', () => {
    const out = WasmProvider.formatToolResponse('foo', '{"a":1}');
    expect(out).toBe('<|tool_response>response:foo{a:1}<tool_response|>');
  });
});

// Exercise the same hallucinated-token stripper regex used inside WasmProvider.
// Kept in sync with the `fullText.replace(...)` chain in wasm.ts.
function stripHallucinatedTokens(s: string): string {
  return s
    .replace(/<\|tool_response>[\s\S]*?<tool_response\|>/g, '')
    .replace(/<\|channel>thought[\s\S]*?<channel\|>/g, '')
    .replace(/<\|think\|>/g, '');
}

describe('stripHallucinatedTokens', () => {
  it('removes <|tool_response>...<tool_response|> blocks', () => {
    const out = stripHallucinatedTokens('hello<|tool_response>response:x{}<tool_response|>world');
    expect(out).toBe('helloworld');
  });
  it('removes ghost <|channel>thought...<channel|> blocks', () => {
    const out = stripHallucinatedTokens('a<|channel>thought\nreasoning\n<channel|>b');
    expect(out).toBe('ab');
  });
  it('removes stray <|think|> markers', () => {
    const out = stripHallucinatedTokens('before<|think|>after');
    expect(out).toBe('beforeafter');
  });
  it('handles multiple occurrences together', () => {
    const input = '<|think|>x<|channel>thought\ny\n<channel|>z<|tool_response>response:a{}<tool_response|>';
    expect(stripHallucinatedTokens(input)).toBe('xz');
  });
});
