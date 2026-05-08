import { describe, it, expect } from 'vitest';
import { runCode } from '../src/recipes/runner.js';

describe('JS sandbox widget helpers', () => {
  it('widget(name, params) pushes a single entry', async () => {
    const res = await runCode(`await widget('echarts-pie', { values: [{ name: 'a', value: 1 }] }); return 42;`, 'js');
    expect(res.status).toBe('done');
    expect(res.widgets).toHaveLength(1);
    expect(res.widgets?.[0]).toMatchObject({ name: 'echarts-pie', params: { values: [{ name: 'a', value: 1 }] } });
    expect(res.output).toBe(42);
  });

  it('widget_display(name, params) works as alias of widget()', async () => {
    const res = await runCode(`widget_display('echarts-pie', { values: [{ name: 'a', value: 1 }] });`, 'js');
    expect(res.status).toBe('done');
    expect(res.widgets).toHaveLength(1);
    expect(res.widgets?.[0]).toMatchObject({ name: 'echarts-pie' });
  });

  it('widget_display({name, params}) works (autoui MCP shape)', async () => {
    const res = await runCode(`widget_display({ name: 'echarts-pie', params: { values: [{ name: 'a', value: 1 }] } });`, 'js');
    expect(res.status).toBe('done');
    expect(res.widgets).toHaveLength(1);
    expect(res.widgets?.[0]).toMatchObject({ name: 'echarts-pie' });
  });

  it('widget_display(widget(...)) does NOT double-push', async () => {
    // The common LLM pattern that previously rendered the widget twice.
    const res = await runCode(
      `const r = await widget('echarts-pie', { values: [] }); widget_display(r);`,
      'js',
    );
    expect(res.status).toBe('done');
    expect(res.widgets).toHaveLength(1);
  });

  it('two distinct widget calls produce two entries', async () => {
    const res = await runCode(
      `await widget('echarts-pie', { values: [] }); await widget('echarts-bar', { rows: [] });`,
      'js',
    );
    expect(res.status).toBe('done');
    expect(res.widgets).toHaveLength(2);
    expect(res.widgets?.[0].name).toBe('echarts-pie');
    expect(res.widgets?.[1].name).toBe('echarts-bar');
  });
});
