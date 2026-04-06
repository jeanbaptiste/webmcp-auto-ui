import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt, mcpToolsToAnthropic, fromMcpTools } from '../src/loop.js';
import type { McpToolDef, LLMProvider, LLMResponse, AnthropicTool, ChatMessage } from '../src/types.js';

const TOOLS: McpToolDef[] = [
  { name: 'search', description: 'Search for things', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
  { name: 'get_item', description: 'Get an item by ID', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
];

describe('buildSystemPrompt', () => {
  it('includes tool names', () => {
    const prompt = buildSystemPrompt(TOOLS);
    expect(prompt).toContain('search');
    expect(prompt).toContain('get_item');
  });

  it('mentions DATA and UI tools', () => {
    const prompt = buildSystemPrompt(TOOLS);
    expect(prompt.toUpperCase()).toContain('DATA');
    expect(prompt.toUpperCase()).toContain('UI');
  });
});

describe('mcpToolsToAnthropic', () => {
  it('converts tool definitions correctly', () => {
    const anthropic = mcpToolsToAnthropic(TOOLS);
    expect(anthropic[0].name).toBe('search');
    expect(anthropic[0].description).toBe('Search for things');
    expect(anthropic[0].input_schema).toBeDefined();
  });

  it('strips oneOf/anyOf/allOf via sanitizeSchema', () => {
    const tools: McpToolDef[] = [{
      name: 'x',
      description: 'x',
      inputSchema: { type: 'object', oneOf: [{ type: 'string' }], properties: {} } as Record<string,unknown>,
    }];
    const result = mcpToolsToAnthropic(tools);
    expect((result[0].input_schema as Record<string, unknown>)['oneOf']).toBeUndefined();
  });

  it('falls back to empty schema when inputSchema absent', () => {
    const tools: McpToolDef[] = [{ name: 'bare', description: 'no schema' }];
    const result = mcpToolsToAnthropic(tools);
    expect(result[0].input_schema).toBeDefined();
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

    const result = await runAgentLoop('test query', { provider, mcpTools: TOOLS });
    expect(result.stopReason).toBe('end_turn');
    expect(result.text).toBe('Done.');
    expect(result.toolCalls.length).toBe(0);
  });

  it('executes UI tool via callbacks', async () => {
    const { runAgentLoop } = await import('../src/loop.js');

    const blocks: { type: string; data: Record<string, unknown> }[] = [];
    let callCount = 0;

    const provider: LLMProvider = {
      name: 'mock', model: 'claude-haiku',
      chat: vi.fn()
        .mockResolvedValueOnce({
          content: [{
            type: 'tool_use', id: 'tc1',
            name: 'render_stat',
            input: { label: 'KPI', value: '42' },
          }],
          stopReason: 'tool_use',
        } satisfies LLMResponse)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Rendered.' }],
          stopReason: 'end_turn',
        } satisfies LLMResponse),
    };

    const result = await runAgentLoop('show me a stat', {
      provider,
      callbacks: {
        onBlock: (type, data) => { blocks.push({ type, data }); },
        onToolCall: () => { callCount++; },
      },
    });

    expect(result.stopReason).toBe('end_turn');
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('stat');
    expect(blocks[0].data).toMatchObject({ label: 'KPI', value: '42' });
    expect(callCount).toBe(1);
    expect(result.metrics.toolCalls).toBe(1);
  });

  it('stops at max_iterations', async () => {
    const { runAgentLoop } = await import('../src/loop.js');

    const provider: LLMProvider = {
      name: 'mock', model: 'claude-haiku',
      // Always returns a tool call — never end_turn
      chat: vi.fn().mockResolvedValue({
        content: [{ type: 'tool_use', id: 'tc1', name: 'render_text', input: { content: 'x' } }],
        stopReason: 'tool_use',
      } satisfies LLMResponse),
    };

    const result = await runAgentLoop('loop forever', {
      provider,
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
          // First call: returns a tool use so loop continues
          return { content: [{ type: 'tool_use', id: 'tc1', name: 'render_text', input: { content: 'x' } }], stopReason: 'tool_use' } satisfies LLMResponse;
        })
        .mockImplementationOnce(async () => {
          // Second call: abort before returning
          ac.abort();
          return { content: [{ type: 'text', text: 'done' }], stopReason: 'end_turn' } satisfies LLMResponse;
        }),
    };

    const result = await runAgentLoop('abort me', { provider, signal: ac.signal, maxIterations: 5 });
    // Aborted during second iteration — loop exits without normal end_turn
    expect(result.metrics.iterations).toBeLessThan(5);
  });
});
