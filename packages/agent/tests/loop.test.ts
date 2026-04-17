import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt, toProviderTools, fromMcpTools } from '../src/loop.js';
import type { McpToolDef, LLMProvider, LLMResponse, ProviderTool, ChatMessage } from '../src/types.js';

const TOOLS: McpToolDef[] = [
  { name: 'search', description: 'Search for things', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
  { name: 'get_item', description: 'Get an item by ID', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
];

describe('buildSystemPrompt', () => {
  it('returns concise behavioral prompt', () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain('assistant IA');
    expect(prompt).toContain('images');
    expect(prompt.length).toBeLessThan(2000); // procedural prompt with recipe workflow
  });
});

describe('toProviderTools', () => {
  it('converts tool definitions correctly', () => {
    const result = toProviderTools(TOOLS);
    expect(result[0].name).toBe('search');
    expect(result[0].description).toBe('Search for things');
    expect(result[0].input_schema).toBeDefined();
  });

  it('strips oneOf/anyOf/allOf via sanitizeSchema', () => {
    const tools: McpToolDef[] = [{
      name: 'x',
      description: 'x',
      inputSchema: { type: 'object', oneOf: [{ type: 'string' }], properties: {} } as Record<string,unknown>,
    }];
    const converted = toProviderTools(tools);
    expect((converted[0].input_schema as Record<string, unknown>)['oneOf']).toBeUndefined();
  });

  it('falls back to empty schema when inputSchema absent', () => {
    const tools: McpToolDef[] = [{ name: 'bare', description: 'no schema' }];
    const converted = toProviderTools(tools);
    expect(converted[0].input_schema).toBeDefined();
  });
});

describe('fromMcpTools', () => {
  it('converts McpTool[] to McpToolDef[]', () => {
    const mcpTools = [
      { name: 'a', description: 'tool a', inputSchema: { type: 'object', properties: {} } },
    ];
    const result = fromMcpTools(mcpTools as Parameters<typeof fromMcpTools>[0]);
    expect(result[0].name).toBe('a');
    expect(result[0].description).toBe('tool a');
  });
});

describe('runAgentLoop', () => {
  it('returns end_turn when LLM returns no tool calls', async () => {
    const { runAgentLoop } = await import('../src/loop.js');

    const provider: LLMProvider = {
      name: 'mock', model: 'claude-haiku',
      chat: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Done.' }],
        stopReason: 'end_turn',
      } satisfies LLMResponse),
    };

    const result = await runAgentLoop('test query', { provider, layers: [{ protocol: 'mcp', serverName: 'test', tools: TOOLS }] });
    expect(result.stopReason).toBe('end_turn');
    expect(result.text).toBe('Done.');
    expect(result.toolCalls.length).toBe(0);
  });

  it('stops at max_iterations', async () => {
    const { runAgentLoop } = await import('../src/loop.js');

    const provider: LLMProvider = {
      name: 'mock', model: 'claude-haiku',
      // Always returns a tool call — never end_turn (using prefixed tool name)
      chat: vi.fn().mockResolvedValue({
        content: [{ type: 'tool_use', id: 'tc1', name: 'test_mcp_search', input: { q: 'x' } }],
        stopReason: 'tool_use',
      } satisfies LLMResponse),
    };

    const result = await runAgentLoop('loop forever', {
      provider,
      layers: [{ protocol: 'mcp', serverName: 'test', tools: TOOLS }],
      maxIterations: 3,
    });

    expect(result.stopReason).toBe('max_iterations');
    expect(result.metrics.iterations).toBe(3);
  });

  it('respects AbortSignal — aborts before second iteration', async () => {
    const { runAgentLoop } = await import('../src/loop.js');
    const ac = new AbortController();

    const provider: LLMProvider = {
      name: 'mock', model: 'claude-haiku',
      chat: vi.fn()
        .mockImplementationOnce(async () => {
          return { content: [{ type: 'tool_use', id: 'tc1', name: 'test_mcp_search', input: { q: 'x' } }], stopReason: 'tool_use' } satisfies LLMResponse;
        })
        .mockImplementationOnce(async () => {
          ac.abort();
          return { content: [{ type: 'text', text: 'done' }], stopReason: 'end_turn' } satisfies LLMResponse;
        }),
    };

    const result = await runAgentLoop('abort me', { provider, signal: ac.signal, layers: [{ protocol: 'mcp', serverName: 'test', tools: TOOLS }], maxIterations: 5 });
    expect(result.metrics.iterations).toBeLessThan(5);
  });
});

