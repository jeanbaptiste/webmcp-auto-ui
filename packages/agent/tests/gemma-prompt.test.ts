import { describe, it, expect } from 'vitest';
import { WasmProvider } from '../src/providers/wasm.js';
import { buildGemmaPrompt, formatGemmaToolDeclaration, gemmaValue } from '../src/prompts/gemma4-prompt-builder.js';
import type { ProviderTool, ChatMessage, ContentBlock } from '../src/types.js';

// Spec source of truth: docs/GEMMA4-SPEC.md
// Each `it()` references the spec section it asserts (`§N.M`). When the code
// under test diverges from the spec, the test is EXPECTED to fail — this file
// documents the target behaviour, not the current (partially-buggy) behaviour.

// ─────────────────────────────────────────────────────────────────────────────
// §5 — Tool declaration wrapper + delimiters + UPPER types + required list
// ─────────────────────────────────────────────────────────────────────────────
describe('formatGemmaToolDeclaration — spec §5', () => {
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

  it('wraps declaration in <|tool>declaration:NAME{...}<tool|> (§5)', () => {
    const decl = formatGemmaToolDeclaration(tool);
    expect(decl.startsWith('<|tool>declaration:tricoteuses_data_search_recipes{')).toBe(true);
    expect(decl.endsWith('}<tool|>')).toBe(true);
  });

  it('uses <|"|> as string delimiters (§3, §5)', () => {
    const decl = formatGemmaToolDeclaration(tool);
    expect(decl).toContain('<|"|>Search recipes by keyword<|"|>');
    expect(decl).toContain('<|"|>query<|"|>');
  });

  it('emits types in UPPER case (§5)', () => {
    const decl = formatGemmaToolDeclaration(tool);
    expect(decl).toContain('type:<|"|>STRING<|"|>');
    expect(decl).toContain('type:<|"|>OBJECT<|"|>');
    expect(decl).not.toMatch(/type:<\|"\|>string<\|"\|>/);
  });

  it('emits required list with <|"|>-quoted names (§5)', () => {
    const decl = formatGemmaToolDeclaration(tool);
    expect(decl).toContain('required:[<|"|>query<|"|>]');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3 + §6 — Value serialization (strings delimited, others bare)
// ─────────────────────────────────────────────────────────────────────────────
describe('gemmaValue — spec §3 + §6', () => {
  it('wraps strings in <|"|> delimiters (§3)', () => {
    expect(gemmaValue('hello')).toBe('<|"|>hello<|"|>');
  });

  it('leaves numbers, booleans and null bare (§3)', () => {
    expect(gemmaValue(42)).toBe('42');
    expect(gemmaValue(true)).toBe('true');
    expect(gemmaValue(false)).toBe('false');
    expect(gemmaValue(null)).toBe('null');
  });

  it('serializes nested objects and arrays (§6)', () => {
    expect(gemmaValue({ a: 1, b: 'x' })).toBe('{a:1,b:<|"|>x<|"|>}');
    expect(gemmaValue([1, 'x'])).toBe('[1,<|"|>x<|"|>]');
  });

  // Spec §3: "No official escape rule" — trou du format. Documented mitigation
  // is client-side pre-cleaning, NOT format-level escaping. We keep the
  // verbatim/collision behaviour and test for it so any future change is
  // intentional. This test therefore PASSES — it freezes the spec-conformant
  // "no escape" behaviour.
  it('does NOT escape <|"|> inside string content (§3, trou du format)', () => {
    expect(gemmaValue('<|"|>')).toBe('<|"|><|"|><|"|>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §6 — Tool call syntax
// ─────────────────────────────────────────────────────────────────────────────
describe('WasmProvider.formatToolCall — spec §6', () => {
  it('emits <|tool_call>call:NAME{k:v,...}<tool_call|> (§6)', () => {
    const out = WasmProvider.formatToolCall('foo', { a: 1, b: 'x' });
    expect(out).toBe('<|tool_call>call:foo{a:1,b:<|"|>x<|"|>}<tool_call|>');
  });

  it('empty object produces an empty brace pair (§6)', () => {
    expect(WasmProvider.formatToolCall('foo', {})).toBe('<|tool_call>call:foo{}<tool_call|>');
  });

  // Bug: Object.entries(null|undefined) throws TypeError. Spec §6 says args are
  // "k:v pairs separated by ," — the empty case IS an empty object. A missing/
  // null input is semantically equivalent to `{}`, not a crash. These tests
  // are EXPECTED TO FAIL until wasm.ts guards against null/undefined.
  it('null input should be treated as {} (§6) — currently throws, bug to fix', () => {
    expect(WasmProvider.formatToolCall('foo', null as unknown as Record<string, unknown>))
      .toBe('<|tool_call>call:foo{}<tool_call|>');
  });

  it('undefined input should be treated as {} (§6) — currently throws, bug to fix', () => {
    expect(WasmProvider.formatToolCall('foo', undefined as unknown as Record<string, unknown>))
      .toBe('<|tool_call>call:foo{}<tool_call|>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7 — Tool response syntax (content can be object, array, primitive, string)
// ─────────────────────────────────────────────────────────────────────────────
describe('WasmProvider.formatToolResponse — spec §7, §10.2, §10.3', () => {
  // Spec §7 prototype: `<|tool_response>response:{CONTENT}<tool_response|>` —
  // no tool name, content passed through literally.
  it('JSON object content passes through literally (§7)', () => {
    expect(WasmProvider.formatToolResponse('{"a":1}'))
      .toBe('<|tool_response>response:{"a":1}<tool_response|>');
  });

  // Spec §10.2 byte-exact.
  it('JSON array top-level passes through literally (§7, §10.2)', () => {
    expect(WasmProvider.formatToolResponse('["Paris","Lyon","Marseille"]'))
      .toBe('<|tool_response>response:["Paris","Lyon","Marseille"]<tool_response|>');
  });

  // Spec §10.3 byte-exact.
  it('JSON primitive number passes through literally (§7, §10.3)', () => {
    expect(WasmProvider.formatToolResponse('42'))
      .toBe('<|tool_response>response:42<tool_response|>');
  });

  it('JSON primitive null passes through literally (§7)', () => {
    expect(WasmProvider.formatToolResponse('null'))
      .toBe('<|tool_response>response:null<tool_response|>');
  });

  it('JSON primitive boolean passes through literally (§7)', () => {
    expect(WasmProvider.formatToolResponse('true'))
      .toBe('<|tool_response>response:true<tool_response|>');
  });

  // Plain-string (JSON.parse fails): analogy with §3 — strings delimited by <|"|>.
  it('plain-string content uses bare <|"|>…<|"|> (§3, §7)', () => {
    expect(WasmProvider.formatToolResponse('raw text'))
      .toBe('<|tool_response>response:<|"|>raw text<|"|><tool_response|>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3 — No escape mechanism for delimiters (trou du format)
// ─────────────────────────────────────────────────────────────────────────────
describe('Delimiter collisions — spec §3 (trou du format)', () => {
  // Spec §3 explicitly states there is NO escape mechanism. Mitigation is the
  // responsibility of the client BEFORE calling the format functions. We
  // therefore freeze the "pass-through verbatim" behaviour and document it.
  it('<tool_call|> inside a string value is emitted verbatim (§3)', () => {
    const out = WasmProvider.formatToolCall('foo', { note: '<tool_call|>' });
    expect(out).toBe('<|tool_call>call:foo{note:<|"|><tool_call|><|"|>}<tool_call|>');
  });

  it('<turn|> inside a JSON string result is emitted verbatim (§3)', () => {
    const out = WasmProvider.formatToolResponse('"contains <turn|> marker"');
    expect(out).toBe('<|tool_response>response:"contains <turn|> marker"<tool_response|>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §1 — Prompt structure (turn delimiters, trailing open model turn)
// ─────────────────────────────────────────────────────────────────────────────
describe('buildGemmaPrompt — spec §1', () => {
  it('produces <|turn>system...<turn|>, <|turn>user...<turn|>, open <|turn>model\\n (§1)', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
    const prompt = buildGemmaPrompt({ systemPrompt: 'SYS', messages });
    expect(prompt).toContain('<|turn>system\nSYS\n<turn|>');
    expect(prompt).toContain('<|turn>user\nHello<turn|>');
    expect(prompt.endsWith('<|turn>model\n')).toBe(true);
  });

  it('maps role "assistant" to <|turn>model (§4)', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Q' },
      { role: 'assistant', content: 'A' },
    ];
    const prompt = buildGemmaPrompt({ messages });
    expect(prompt).toContain('<|turn>user\nQ<turn|>');
    expect(prompt).toContain('<|turn>model\nA<turn|>');
  });

  it('serializes tool_use blocks as <|tool_call>call:...<tool_call|> (§6)', () => {
    const blocks: ContentBlock[] = [
      { type: 'tool_use', id: 'tu1', name: 'search', input: { query: 'cats' } },
    ];
    const prompt = buildGemmaPrompt({ messages: [{ role: 'assistant', content: blocks }] });
    expect(prompt).toContain('<|tool_call>call:search{query:<|"|>cats<|"|>}<tool_call|>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4 + §7 — Role handling & tool_response placement
// ─────────────────────────────────────────────────────────────────────────────
describe('buildGemmaPrompt — roles & tool_response placement (spec §4, §7, §10.1)', () => {
  // Spec §4: "tool role does NOT exist in Gemma 4. Tool responses stay inside
  // the open model turn."
  // Spec §7 (byte-exact example): when a client replies to a tool_call with a
  // tool_result, that result must be serialized INSIDE the same <|turn>model
  // block that contained the tool_call — NOT in a new user or tool turn.
  //
  // Current code creates a separate <|turn>user block for the tool_result
  // (because `role:'user'` in the client ChatMessage) — this is the
  // STRUCTURAL BUG. Test is EXPECTED TO FAIL.
  it('§10.1 byte-exact: tool_response nests inside the model turn with the tool_call', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Quel temps à Paris ?' },
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'tu1', name: 'get_weather', input: { city: 'Paris' } },
        ],
      },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'tu1', content: '{"temp":12,"condition":"rain"}' },
        ],
      },
    ];
    const prompt = buildGemmaPrompt({ messages });

    // Positive: the call and the response must sit inside the SAME model turn.
    const expectedFragment =
      '<|turn>model\n' +
      '<|tool_call>call:get_weather{city:<|"|>Paris<|"|>}<tool_call|>' +
      '<|tool_response>response:{"temp":12,"condition":"rain"}<tool_response|>' +
      '\n<turn|>';
    expect(prompt).toContain(expectedFragment);

    // Negative: a separate user turn wrapping a tool_response is a spec violation.
    expect(prompt).not.toMatch(/<\|turn>user\n<\|tool_response>/);
  });

  // Spec §10.1 byte-exact golden: full prompt (system + user + model with
  // call+response + open model). Asserts the full structure byte-for-byte.
  // EXPECTED TO FAIL until the structural bug above is fixed.
  it('§10.1 golden byte-exact full prompt', () => {
    const systemPrompt =
      'You are a helpful weather assistant.\n\n' +
      '<|tool>declaration:get_weather{description:<|"|>Get weather for a city<|"|>,parameters:{properties:{city:{type:<|"|>STRING<|"|>,description:<|"|>City name<|"|>}},required:[<|"|>city<|"|>],type:<|"|>OBJECT<|"|>}}<tool|>';
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Quel temps à Paris ?' },
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'tu1', name: 'get_weather', input: { city: 'Paris' } },
        ],
      },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'tu1', content: '{"temp":12,"condition":"rain"}' },
        ],
      },
    ];
    const prompt = buildGemmaPrompt({ systemPrompt, messages });

    const expected =
      `<|turn>system\n${systemPrompt}\n<turn|>\n` +
      '<|turn>user\nQuel temps à Paris ?<turn|>\n' +
      '<|turn>model\n' +
      '<|tool_call>call:get_weather{city:<|"|>Paris<|"|>}<tool_call|>' +
      '<|tool_response>response:{"temp":12,"condition":"rain"}<tool_response|>' +
      '\n<turn|>\n' +
      '<|turn>model\n';

    expect(prompt).toBe(expected);
  });

  // Spec §10.7: unknown roles are not defined by the format. The safe rule is
  // "map to system/user/model client-side". Current code coerces any non-
  // "assistant" role to "user". For a raw `role: 'tool'` message (hypothetical
  // — clients should not emit this given §4), coercing to "user" is the
  // least-dangerous fallback. We document the current behaviour here.
  it('exotic role "tool" on a top-level message falls back to user turn (§10.7, defensive)', () => {
    const messages = [{ role: 'tool', content: 'T' }] as unknown as ChatMessage[];
    const prompt = buildGemmaPrompt({ messages });
    expect(prompt).toContain('<|turn>user\nT<turn|>');
  });

  // Spec §4: role "system" in a per-message context should map to system.
  // Current code coerces anything ≠ "assistant" to "user", so a message with
  // role "system" produces a user turn. This is a minor divergence from §4
  // (the system block should be rendered via the `systemPrompt` input anyway,
  // not as a message) — test is EXPECTED TO FAIL if we strictly enforce §4.
  it('role "system" in a message should map to <|turn>system (§4)', () => {
    const messages = [{ role: 'system', content: 'SYS-AS-MSG' }] as unknown as ChatMessage[];
    const prompt = buildGemmaPrompt({ messages });
    expect(prompt).toContain('<|turn>system\nSYS-AS-MSG<turn|>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9 — Hallucinated-token stripping
// ─────────────────────────────────────────────────────────────────────────────
// Mirror of the regex chain applied in WasmProvider._chat before parsing.
function stripHallucinatedTokens(s: string): string {
  return s
    .replace(/<\|tool_response>[\s\S]*?<tool_response\|>/g, '')
    .replace(/<\|channel>thought[\s\S]*?<channel\|>/g, '')
    .replace(/<\|think\|>/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// parseGemmaArgs — nested & mixed syntax (§6)
// ─────────────────────────────────────────────────────────────────────────────
describe('parseGemmaArgs — nested & mixed syntax', () => {
  const parse = (raw: string): Record<string, unknown> =>
    (WasmProvider as unknown as { parseGemmaArgs: (r: string) => Record<string, unknown> })
      .parseGemmaArgs ? (WasmProvider as any).parseGemmaArgs(raw) : (() => { throw new Error('no'); })();

  it('pure Gemma native, nested object + array of arrays', () => {
    const raw = '{name:<|"|>kv<|"|>,params:{title:<|"|>x<|"|>,rows:[[<|"|>a<|"|>,<|"|>b<|"|>]]}}';
    expect(parse(raw)).toEqual({
      name: 'kv',
      params: { title: 'x', rows: [['a', 'b']] },
    });
  });

  it('mixed native + JSON-quoted string with raw newlines, backticks, ${} and apostrophes', () => {
    const code =
      "```js\ndocument.getElementById('out').textContent = (function(){\n" +
      "  const prefix = 'EXEC-HUMMINGBIRD-H2947';\n" +
      "  return `${prefix}`;\n" +
      "})();\n```";
    // Gemma emits this with a real double-quoted string containing raw newlines.
    const raw = '{name:<|"|>js-sandbox<|"|>,params:{code:' + JSON.stringify(code).replace(/\\n/g, '\n') + '}}';
    const got = parse(raw);
    expect(got.name).toBe('js-sandbox');
    expect((got.params as Record<string, unknown>).code).toBe(code);
  });

  it('array of Gemma native strings', () => {
    expect(parse('{tags:[<|"|>a<|"|>,<|"|>b<|"|>,<|"|>c<|"|>]}'))
      .toEqual({ tags: ['a', 'b', 'c'] });
  });

  it('empty object {} returns {}', () => {
    expect(parse('{}')).toEqual({});
  });

  it('malformed input returns {} (safe fallback)', () => {
    expect(parse('{name:<|"|>unterminated')).toEqual({});
    expect(parse('not an object at all')).toEqual({});
    expect(parse('{name:<|"|>x<|"|>,broken:')).toEqual({});
  });

  it('numbers, booleans, null are preserved', () => {
    expect(parse('{n:42,f:-1.5,t:true,fa:false,z:null}'))
      .toEqual({ n: 42, f: -1.5, t: true, fa: false, z: null });
  });

  // Bug fix: Gemma recopies `\n` from tool-result JSON into its <|"|>…<|"|>
  // string args. Without decoding, the backslash+n survive as two chars and
  // later get re-escaped to `\\n` by JSON.stringify, reaching the sandbox as
  // literal text instead of real newlines. These tests freeze the decoding
  // contract: standard escapes (\n \t \r \" \\) become their real characters.
  it('decodes \\n inside <|"|>…<|"|> to a real newline', () => {
    const got = parse('{code:<|"|>a\\nb<|"|>}');
    expect(got.code).toBe('a\nb');
  });

  it('preserves a literal backslash written as \\\\n', () => {
    const got = parse('{code:<|"|>a\\\\nb<|"|>}');
    expect(got.code).toBe('a\\nb');
  });

  it('decodes \\" inside <|"|>…<|"|> to a real double-quote', () => {
    const got = parse('{msg:<|"|>say \\"hi\\"<|"|>}');
    expect(got.msg).toBe('say "hi"');
  });
});

describe('stripHallucinatedTokens — spec §9', () => {
  it('removes hallucinated <|tool_response>...<tool_response|> (§9, §10.6)', () => {
    expect(stripHallucinatedTokens('hello<|tool_response>response:x{}<tool_response|>world'))
      .toBe('helloworld');
  });

  it('removes ghost <|channel>thought...<channel|> (§8, §9)', () => {
    expect(stripHallucinatedTokens('a<|channel>thought\nreasoning\n<channel|>b')).toBe('ab');
  });

  it('removes stray <|think|> markers (§9)', () => {
    expect(stripHallucinatedTokens('before<|think|>after')).toBe('beforeafter');
  });

  it('handles all three hallucinations in one string (§9)', () => {
    const input =
      '<|think|>x<|channel>thought\ny\n<channel|>z' +
      '<|tool_response>response:a{}<tool_response|>';
    expect(stripHallucinatedTokens(input)).toBe('xz');
  });
});
