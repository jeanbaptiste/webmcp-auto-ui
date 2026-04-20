/**
 * Demo data for every WidgetRenderer type.
 * Each entry is { type, data } matching WidgetRenderer's Props.
 */

export interface DemoBlock {
  type: string;
  label: string;
  data: Record<string, unknown>;
}

export const SIMPLE_BLOCKS: DemoBlock[] = [
  {
    type: 'stat',
    label: 'Stat',
    data: { label: 'Monthly revenue', value: '$42,850', trend: '+12.4% vs last month', trendDir: 'up' },
  },
  {
    type: 'kv',
    label: 'Key-Value',
    data: {
      title: 'Server configuration',
      rows: [
        ['OS', 'Debian 12 Bookworm'],
        ['CPU', '8 vCPU (Xeon E5)'],
        ['RAM', '32 GB DDR4'],
        ['Storage', '500 GB NVMe'],
        ['Uptime', '147 days'],
      ],
    },
  },
  {
    type: 'list',
    label: 'List',
    data: {
      title: 'Next steps',
      items: [
        'Validate mockups with the client',
        'Deploy to staging for UAT testing',
        'Migrate PostgreSQL database to v16',
        'Enable Prometheus monitoring',
      ],
    },
  },
  {
    type: 'chart',
    label: 'Chart (bars)',
    data: {
      title: 'Visitors per day',
      bars: [['Mon', 420], ['Tue', 580], ['Wed', 310], ['Thu', 690], ['Fri', 870], ['Sat', 540], ['Sun', 230]],
    },
  },
  {
    type: 'alert',
    label: 'Alert (info)',
    data: { title: 'Update available', message: 'Version 2.4.1 fixes a rendering bug on Safari. Recommendation: update before Friday.', level: 'info' },
  },
  {
    type: 'alert',
    label: 'Alert (warn)',
    data: { title: 'Disk quota at 85%', message: 'The /data volume is at 85% capacity. Schedule a cleanup or an extension.', level: 'warn' },
  },
  {
    type: 'alert',
    label: 'Alert (error)',
    data: { title: 'CI build failed', message: 'Pipeline main #347 failed at the e2e test step. 3 tests in error.', level: 'error' },
  },
  {
    type: 'code',
    label: 'Code',
    data: {
      lang: 'typescript',
      content: `import { WidgetRenderer } from '@webmcp-auto-ui/ui';

// Render any widget type dynamically
const widgets = canvas.blocks;
for (const widget of widgets) {
  render(WidgetRenderer, { type: widget.type, data: widget.data });
}`,
    },
  },
  {
    type: 'text',
    label: 'Text',
    data: { content: 'WebMCP Auto-UI is a framework that lets an AI agent generate dynamic user interfaces in real time. Every component can be instantiated, modified and removed by the agent through the MCP protocol.' },
  },
  {
    type: 'actions',
    label: 'Actions',
    data: {
      buttons: [
        { label: 'Deploy', primary: true },
        { label: 'Cancel' },
        { label: 'View logs' },
      ],
    },
  },
  {
    type: 'tags',
    label: 'Tags',
    data: {
      label: 'Stack:',
      tags: [
        { text: 'SvelteKit', active: true },
        { text: 'TypeScript', active: true },
        { text: 'Tailwind' },
        { text: 'Vite', active: true },
        { text: 'WebMCP' },
        { text: 'MediaPipe' },
      ],
    },
  },
];

export const RICH_BLOCKS: DemoBlock[] = [
  {
    type: 'stat-card',
    label: 'Stat Card',
    data: { label: 'Active users', value: '12,847', unit: 'MAU', trend: 'up', delta: '+18%', variant: 'success' },
  },
  {
    type: 'data-table',
    label: 'Data Table',
    data: {
      title: 'Recent deployments',
      columns: [
        { key: 'env', label: 'Environment' },
        { key: 'version', label: 'Version' },
        { key: 'date', label: 'Date', align: 'right' },
        { key: 'status', label: 'Status' },
      ],
      rows: [
        { env: 'Production', version: 'v2.4.0', date: '2026-04-09', status: 'OK' },
        { env: 'Staging', version: 'v2.5.0-rc1', date: '2026-04-08', status: 'OK' },
        { env: 'Preview', version: 'v2.5.0-alpha.3', date: '2026-04-07', status: 'Failed' },
        { env: 'Production', version: 'v2.3.2', date: '2026-04-01', status: 'OK' },
        { env: 'Staging', version: 'v2.4.0-rc2', date: '2026-03-28', status: 'OK' },
      ],
      striped: true,
    },
  },
  {
    type: 'timeline',
    label: 'Timeline',
    data: {
      title: 'Project history',
      events: [
        { date: '2026-01-15', title: 'WebMCP project kickoff', description: 'Scope and architecture definition', status: 'done' },
        { date: '2026-02-20', title: 'Release v1.0', description: 'First working prototype with Gemma support', status: 'done' },
        { date: '2026-03-10', title: 'Native MCP integration', description: 'Full MCP protocol support via WebMCP polyfill', status: 'done' },
        { date: '2026-04-09', title: 'Phase 6: Dynamic showcase', description: 'Multi-theme demo app', status: 'active' },
        { date: '2026-05-01', title: 'Release v3.0', description: 'Multi-agent, collaborative tools', status: 'pending' },
      ],
    },
  },
  {
    type: 'profile',
    label: 'Profile Card',
    data: {
      name: 'Ada Lovelace',
      subtitle: 'Lead Architect @ WebMCP',
      badge: { text: 'Admin', variant: 'success' },
      fields: [
        { label: 'Email', value: 'ada@webmcp.dev' },
        { label: 'Team', value: 'Core Platform' },
        { label: 'Location', value: 'London, UK' },
      ],
      stats: [
        { label: 'Commits', value: '1,247' },
        { label: 'PRs', value: '386' },
        { label: 'Reviews', value: '892' },
      ],
      actions: [
        { label: 'View profile', variant: 'primary' },
        { label: 'Message', variant: 'secondary' },
      ],
    },
  },
  {
    type: 'trombinoscope',
    label: 'Trombinoscope',
    data: {
      title: 'WebMCP Team',
      columns: 4,
      showBadge: true,
      people: [
        { name: 'Ada Lovelace', subtitle: 'Architect', badge: 'Lead' },
        { name: 'Alan Turing', subtitle: 'Backend', badge: 'Senior' },
        { name: 'Grace Hopper', subtitle: 'DevOps', badge: 'Senior' },
        { name: 'Linus Torvalds', subtitle: 'Infra', badge: 'Staff' },
        { name: 'Margaret Hamilton', subtitle: 'Frontend', badge: 'Senior' },
        { name: 'Dennis Ritchie', subtitle: 'Core', badge: 'Staff' },
        { name: 'Barbara Liskov', subtitle: 'QA', badge: 'Lead' },
        { name: 'Bjarne Stroustrup', subtitle: 'Perf', badge: 'Senior' },
      ],
    },
  },
  {
    type: 'json-viewer',
    label: 'JSON Viewer',
    data: {
      title: 'API response',
      expanded: true,
      data: {
        status: 'success',
        data: {
          user: { id: 42, name: 'Ada', roles: ['admin', 'dev'] },
          session: { token: '***', expiresAt: '2026-04-10T00:00:00Z' },
          features: ['mcp', 'gemma', 'multi-agent'],
        },
        meta: { requestId: 'req_abc123', latency: '12ms' },
      },
    },
  },
  {
    type: 'hemicycle',
    label: 'Hemicycle',
    data: {
      title: 'Parliament (sim.)',
      groups: [
        { id: 'left', label: 'Left', seats: 75, color: '#c0392b' },
        { id: 'soc', label: 'Social Dem', seats: 31, color: '#e74c8b' },
        { id: 'green', label: 'Green', seats: 23, color: '#27ae60' },
        { id: 'lib', label: 'Liberal', seats: 51, color: '#f39c12' },
        { id: 'centre', label: 'Centre', seats: 170, color: '#3498db' },
        { id: 'cons', label: 'Conservative', seats: 62, color: '#2c3e50' },
        { id: 'right', label: 'Right', seats: 89, color: '#1a237e' },
      ],
      rows: 5,
    },
  },
  {
    type: 'chart-rich',
    label: 'Chart (rich bar)',
    data: {
      title: 'API response time (ms)',
      type: 'bar',
      labels: ['GET /users', 'POST /auth', 'GET /widgets', 'PUT /canvas', 'DELETE /session'],
      data: [
        { label: 'p50', values: [12, 45, 8, 22, 5], color: '#3ecfb2' },
        { label: 'p99', values: [89, 230, 42, 110, 18], color: '#fa6d7c' },
      ],
      legend: true,
    },
  },
  {
    type: 'chart-rich',
    label: 'Chart (rich pie)',
    data: {
      title: 'Traffic breakdown',
      type: 'donut',
      labels: ['Desktop', 'Mobile', 'Tablet', 'API'],
      data: [{ label: 'Traffic', values: [45, 38, 12, 5] }],
    },
  },
  {
    type: 'cards',
    label: 'Cards',
    data: {
      title: 'Monorepo packages',
      cards: [
        { title: '@webmcp-auto-ui/core', description: 'MCP client, tool groups, WebMCP polyfill', tags: ['core', 'mcp'] },
        { title: '@webmcp-auto-ui/ui', description: 'Svelte 5 components, theme system, widgets', tags: ['ui', 'svelte'] },
        { title: '@webmcp-auto-ui/agent', description: 'Agent loop, LLM providers, WebMCP widgets', tags: ['agent', 'llm'] },
        { title: '@webmcp-auto-ui/sdk', description: 'Canvas store, HyperSkill encode/decode', tags: ['sdk', 'canvas'] },
      ],
    },
  },
  {
    type: 'grid-data',
    label: 'Grid Data',
    data: {
      title: 'Browser compatibility matrix',
      columns: [
        { key: 'feature', label: 'Feature', width: '180px' },
        { key: 'chrome', label: 'Chrome' },
        { key: 'firefox', label: 'Firefox' },
        { key: 'safari', label: 'Safari' },
        { key: 'edge', label: 'Edge' },
      ],
      rows: [
        ['WebGPU', 'Yes', 'Flag', 'No', 'Yes'],
        ['WebMCP', 'Yes', 'Yes', 'Yes', 'Yes'],
        ['SharedArrayBuffer', 'Yes', 'Yes', 'Yes', 'Yes'],
        ['WASM SIMD', 'Yes', 'Yes', 'Yes', 'Yes'],
      ],
      highlights: [
        { row: 0, col: 2, color: 'rgba(240,160,80,0.2)' },
        { row: 0, col: 3, color: 'rgba(250,109,124,0.2)' },
      ],
    },
  },
  {
    type: 'sankey',
    label: 'Sankey',
    data: {
      title: 'Agent data flow',
      nodes: [
        { id: 'user', label: 'User', color: '#3b82f6' },
        { id: 'agent', label: 'Agent Loop', color: '#7c6dfa' },
        { id: 'gemma', label: 'Gemma (WASM)', color: '#f0a050' },
        { id: 'claude', label: 'Claude API', color: '#3ecfb2' },
        { id: 'mcp', label: 'MCP Tools', color: '#fa6d7c' },
        { id: 'canvas', label: 'Canvas', color: '#a855f7' },
      ],
      links: [
        { source: 'user', target: 'agent', value: 100, label: 'prompt' },
        { source: 'agent', target: 'gemma', value: 40, label: 'local' },
        { source: 'agent', target: 'claude', value: 60, label: 'remote' },
        { source: 'gemma', target: 'mcp', value: 30 },
        { source: 'claude', target: 'mcp', value: 50 },
        { source: 'mcp', target: 'canvas', value: 80, label: 'widgets' },
      ],
    },
  },
  {
    type: 'log',
    label: 'Log Viewer',
    data: {
      title: 'Agent logs',
      entries: [
        { timestamp: '14:23:01.123', level: 'info', message: 'Agent loop started', source: 'agent' },
        { timestamp: '14:23:01.456', level: 'debug', message: 'Sending prompt to Gemma WASM provider', source: 'gemma' },
        { timestamp: '14:23:03.789', level: 'info', message: 'Tool call: autoui_ui_widget_display({ name: "stat", params: {...} })', source: 'agent' },
        { timestamp: '14:23:03.801', level: 'info', message: 'Widget stat_revenue rendered', source: 'canvas' },
        { timestamp: '14:23:04.100', level: 'warn', message: 'Token budget at 82% (3280/4000)', source: 'agent' },
        { timestamp: '14:23:05.500', level: 'error', message: 'MCP tool fetch_data timed out after 5000ms', source: 'mcp' },
        { timestamp: '14:23:05.510', level: 'info', message: 'Retrying with fallback data', source: 'agent' },
      ],
    },
  },
  {
    type: 'carousel',
    label: 'Carousel',
    data: {
      title: 'Screenshots',
      autoPlay: true,
      interval: 4000,
      slides: [
        { title: 'Main dashboard', subtitle: 'Agent view with canvas and chat', content: 'The agent generates widgets in real time via the MCP protocol.' },
        { title: 'Cyberpunk theme', subtitle: 'Neon and strong contrasts', content: 'The theme system lets you change the look of the whole app in one click.' },
        { title: 'Multi-agent', subtitle: 'Agent collaboration', content: 'Multiple agents can work on the same canvas simultaneously.' },
      ],
    },
  },
];

export const ALL_BLOCKS: DemoBlock[] = [...SIMPLE_BLOCKS, ...RICH_BLOCKS];
