import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt, mcpToolsToAnthropic, fromMcpTools } from '../src/loop.js';
import { validateParams } from '../src/component-tool.js';
import type { ValidationResult } from '../src/component-tool.js';
import type { McpToolDef, LLMProvider, LLMResponse, AnthropicTool, ChatMessage } from '../src/types.js';

const TOOLS: McpToolDef[] = [
  { name: 'search', description: 'Search for things', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
  { name: 'get_item', description: 'Get an item by ID', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
];

describe('buildSystemPrompt', () => {
  it('returns concise behavioral prompt', () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain('component(');
    expect(prompt).toContain('images');
    expect(prompt.length).toBeLessThan(600); // must stay concise
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

    const result = await runAgentLoop('test query', { provider, layers: [{ source: 'mcp', serverUrl: 'test', tools: TOOLS }] });
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
            name: 'component',
            input: { name: 'stat', params: { label: 'KPI', value: '42' } },
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
        content: [{ type: 'tool_use', id: 'tc1', name: 'component', input: { name: 'text', params: { content: 'x' } } }],
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
          return { content: [{ type: 'tool_use', id: 'tc1', name: 'component', input: { name: 'text', params: { content: 'x' } } }], stopReason: 'tool_use' } satisfies LLMResponse;
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

// ── Option C — schema validation ──────────────────────────────────────────────

describe('Option C — schema validation', () => {
  // Schema for render_table (from UI_TOOLS)
  const tableSchema: Record<string, unknown> = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      columns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            label: { type: 'string' },
            align: { type: 'string', enum: ['left', 'center', 'right'] },
          },
          required: ['key', 'label'],
        },
      },
      rows: { type: 'array', items: { type: 'object' } },
    },
    required: ['rows'],
  };

  // Schema for render_stat
  const statSchema: Record<string, unknown> = {
    type: 'object',
    properties: {
      label: { type: 'string' },
      value: { type: 'string' },
      trend: { type: 'string' },
      trendDir: { type: 'string', enum: ['up', 'down', 'neutral'] },
    },
    required: ['label', 'value'],
  };

  it('valid params — returns valid', () => {
    const result = validateParams(
      { rows: [{ name: 'Alice', age: 30 }], columns: [{ key: 'name', label: 'Name' }] },
      tableSchema,
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('missing required field — returns issues', () => {
    const result = validateParams(
      { title: 'My Table' },  // missing 'rows'
      tableSchema,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some(i => i.includes('"rows"'))).toBe(true);
  });

  it('wrong field name (items vs rows) — returns hint', () => {
    const result = validateParams(
      { items: [{ name: 'Alice' }] },  // 'items' instead of 'rows'
      tableSchema,
    );
    expect(result.valid).toBe(false);
    // Should mention both the missing 'rows' and the unknown 'items'
    expect(result.issues.some(i => i.includes('"rows"') && i.includes('"items"'))).toBe(true);
  });

  it('wrong type (string[] vs object[]) — returns hint', () => {
    const result = validateParams(
      {
        rows: [{ name: 'Alice' }],
        columns: ['Name', 'Age'],  // string[] instead of object[]
      },
      tableSchema,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('"columns"') && i.includes('object'))).toBe(true);
  });

  it('wrong basic type — string vs number', () => {
    const result = validateParams(
      { label: 42, value: 'ok' },  // label should be string
      statSchema,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('"label"') && i.includes('string'))).toBe(true);
  });

  it('array field receives non-array — returns issue', () => {
    const result = validateParams(
      { rows: 'not an array' },
      tableSchema,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('"rows"') && i.includes('array'))).toBe(true);
  });

  // Coercion test removed — coercion was deleted in the Phase 7 simplification.
  // Schema validation is now always on (schemaValidation defaults to true).

  it('schemaValidation=true with invalid params — returns schema instead of rendering', async () => {
    const { runAgentLoop } = await import('../src/loop.js');

    const blocks: { type: string; data: Record<string, unknown> }[] = [];
    let lastToolResult = '';

    const provider: LLMProvider = {
      name: 'mock', model: 'claude-haiku',
      chat: vi.fn()
        .mockResolvedValueOnce({
          content: [{
            type: 'tool_use', id: 'tc1',
            name: 'component',
            // 'items' is wrong — table expects 'rows'
            input: { name: 'table', params: { items: [{ name: 'Alice' }] } },
          }],
          stopReason: 'tool_use',
        } satisfies LLMResponse)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Got it.' }],
          stopReason: 'end_turn',
        } satisfies LLMResponse),
    };

    const result = await runAgentLoop('show table', {
      provider,
      schemaValidation: true,
      callbacks: {
        onBlock: (type, data) => { blocks.push({ type, data }); },
        onToolCall: (call) => { if (call.result) lastToolResult = call.result; },
      },
    });

    // No block should have been rendered
    expect(blocks.length).toBe(0);
    // The tool result should contain schema and issues
    const parsed = JSON.parse(lastToolResult);
    expect(parsed.error).toContain('Invalid params');
    expect(parsed.issues.length).toBeGreaterThan(0);
    expect(parsed.schema).toBeDefined();
  });

  it('schemaValidation=true with valid params — renders directly', async () => {
    const { runAgentLoop } = await import('../src/loop.js');

    const blocks: { type: string; data: Record<string, unknown> }[] = [];

    const provider: LLMProvider = {
      name: 'mock', model: 'claude-haiku',
      chat: vi.fn()
        .mockResolvedValueOnce({
          content: [{
            type: 'tool_use', id: 'tc1',
            name: 'component',
            input: { name: 'stat', params: { label: 'Users', value: '1234' } },
          }],
          stopReason: 'tool_use',
        } satisfies LLMResponse)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Done.' }],
          stopReason: 'end_turn',
        } satisfies LLMResponse),
    };

    const result = await runAgentLoop('show stat', {
      provider,
      schemaValidation: true,
      callbacks: {
        onBlock: (type, data) => { blocks.push({ type, data }); },
      },
    });

    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('stat');
    expect(blocks[0].data).toMatchObject({ label: 'Users', value: '1234' });
  });
});
