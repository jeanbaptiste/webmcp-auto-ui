/**
 * Unified `component` tool — discovery + render via a single tool.
 *
 * Coexists with the individual render_* tools; both are valid.
 *
 * Usage (from the LLM side):
 *   component("help")                     → list all components
 *   component("help", "stat-card")        → schema of stat-card
 *   component("stat-card", { label: … })  → render stat-card
 *
 * Inspired by a suggestion from Emmanuel Raviart, creator of Moulineuse MCP server
 * (https://www.tricoteuses.fr/mcp)
 */

import { UI_TOOLS, executeUITool } from './ui-tools.js';
import type { AnthropicTool, AgentCallbacks } from './types.js';

// ── Registry ─────────────────────────────────────────────────────────────────

export interface ComponentEntry {
  /** Short name without render_ prefix (e.g. "stat-card") */
  name: string;
  /** Original tool name (e.g. "render_stat_card") */
  toolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** true if the component can be rendered via executeUITool (render_* tools + canvas actions) */
  renderable: boolean;
}

/** Map<shortName, ComponentEntry> — mutable so apps can register custom components */
export const componentRegistry = new Map<string, ComponentEntry>();

// Populate from UI_TOOLS
for (const tool of UI_TOOLS) {
  let shortName: string;

  if (tool.name.startsWith('render_')) {
    // render_stat_card → stat-card
    shortName = tool.name.slice('render_'.length).replace(/_/g, '-');
  } else if (tool.name === 'clear_canvas') {
    shortName = 'clear';
  } else if (tool.name === 'update_block') {
    shortName = 'update';
  } else if (tool.name === 'move_block') {
    shortName = 'move';
  } else if (tool.name === 'resize_block') {
    shortName = 'resize';
  } else if (tool.name === 'style_block') {
    shortName = 'style';
  } else {
    shortName = tool.name;
  }

  const entry: ComponentEntry = {
    name: shortName,
    toolName: tool.name,
    description: tool.description,
    inputSchema: tool.input_schema,
    renderable: true,
  };

  componentRegistry.set(shortName, entry);
  // Also register with the original tool name for back-compat
  if (shortName !== tool.name) {
    componentRegistry.set(tool.name, entry);
  }
}

// ── Additional UI components (not in UI_TOOLS) ─────────────────────────────

const EXTRA_COMPONENTS: ComponentEntry[] = [
  // ── Primitives (layout containers) ────────────────────────────────────────
  {
    name: 'card',
    toolName: 'card',
    description: 'Container card with optional header and footer slots.',
    inputSchema: {
      type: 'object',
      properties: {
        class: { type: 'string', description: 'Additional CSS classes.' },
      },
    },
    renderable: false,
  },
  {
    name: 'grid-layout',
    toolName: 'grid-layout',
    description: 'Responsive grid layout. Stacks on mobile, multi-column on desktop.',
    inputSchema: {
      type: 'object',
      properties: {
        cols: { type: 'number', description: 'Number of columns (default: 2). Can also be a CSS grid-template-columns string.' },
        gap: { type: 'number', description: 'Gap between cells in Tailwind spacing units (default: 4, i.e. 16px).' },
        class: { type: 'string' },
      },
    },
    renderable: false,
  },
  {
    name: 'list-primitive',
    toolName: 'list-primitive',
    description: 'Scrollable list container with item snippet and optional empty state.',
    inputSchema: {
      type: 'object',
      properties: {
        items: { type: 'array', description: 'Array of items to render.' },
        maxHeight: { type: 'string', description: 'CSS max-height (default: "none").' },
        class: { type: 'string' },
      },
      required: ['items'],
    },
    renderable: false,
  },
  {
    name: 'panel',
    toolName: 'panel',
    description: 'Panel with optional title header and scrollable content area.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title displayed in the panel header.' },
        class: { type: 'string' },
      },
    },
    renderable: false,
  },
  {
    name: 'window',
    toolName: 'window',
    description: 'Window with a draggable title bar.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Window title displayed in the title bar.' },
        draggable: { type: 'boolean', description: 'Enable drag-to-move (default: false).' },
        class: { type: 'string' },
      },
      required: ['title'],
    },
    renderable: false,
  },

  // ── Base shadcn (UI primitives) ───────────────────────────────────────────
  {
    name: 'button',
    toolName: 'button',
    description: 'Button with variants: default, outline, destructive, ghost.',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Button text.' },
        variant: { type: 'string', enum: ['default', 'outline', 'ghost', 'destructive'] },
        size: { type: 'string', enum: ['default', 'sm', 'lg', 'icon'] },
        disabled: { type: 'boolean' },
      },
      required: ['label'],
    },
    renderable: false,
  },
  {
    name: 'input',
    toolName: 'input',
    description: 'Text input field with monospace font and themed border.',
    inputSchema: {
      type: 'object',
      properties: {
        value: { type: 'string', description: 'Current input value.' },
        placeholder: { type: 'string' },
        type: { type: 'string', description: 'HTML input type (text, password, email, etc.).' },
        disabled: { type: 'boolean' },
        class: { type: 'string' },
      },
    },
    renderable: false,
  },
  {
    name: 'badge',
    toolName: 'badge',
    description: 'Badge/tag with color variants: default, success, warning, destructive, outline.',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Badge text.' },
        variant: { type: 'string', enum: ['default', 'success', 'warning', 'destructive', 'outline'] },
        size: { type: 'string', enum: ['default', 'sm'] },
      },
      required: ['label'],
    },
    renderable: false,
  },
  {
    name: 'select',
    toolName: 'select',
    description: 'Native <select> dropdown, themed to match the design system.',
    inputSchema: {
      type: 'object',
      properties: {
        value: { type: 'string', description: 'Currently selected value.' },
        options: {
          type: 'array',
          items: { type: 'object', properties: { value: { type: 'string' }, label: { type: 'string' } }, required: ['value', 'label'] },
          description: 'Array of { value, label } options.',
        },
        class: { type: 'string' },
      },
    },
    renderable: false,
  },
  {
    name: 'tooltip',
    toolName: 'tooltip',
    description: 'Tooltip shown on hover over its child element.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Tooltip text.' },
        class: { type: 'string' },
      },
      required: ['content'],
    },
    renderable: false,
  },
  {
    name: 'dialog',
    toolName: 'dialog',
    description: 'Modal dialog overlay with backdrop. Compose with DialogContent, DialogHeader, DialogTitle, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        open: { type: 'boolean', description: 'Whether the dialog is open.' },
      },
    },
    renderable: false,
  },

  // ── Layouts (window manager) ──────────────────────────────────────────────
  {
    name: 'tiling-layout',
    toolName: 'tiling-layout',
    description: 'Tiling window manager layout. Splits space proportionally for managed windows.',
    inputSchema: {
      type: 'object',
      properties: {
        windows: { type: 'array', description: 'Array of ManagedWindow objects ({ id, title, visible?, weight? }).' },
        gap: { type: 'number', description: 'Gap in pixels between tiles (default: 4).' },
        ratio: { type: 'number', description: 'Primary/secondary split ratio (default: 0.6).' },
        padding: { type: 'number', description: 'Outer padding in pixels (default: 0).' },
      },
      required: ['windows'],
    },
    renderable: false,
  },
  {
    name: 'floating-layout',
    toolName: 'floating-layout',
    description: 'Floating window manager with drag-and-drop, resize handles, collapse. Falls back to stacked scroll on mobile.',
    inputSchema: {
      type: 'object',
      properties: {
        windows: { type: 'array', description: 'Array of ManagedWindow objects ({ id, title, visible?, weight? }).' },
        gap: { type: 'number', description: 'Gap in pixels between windows (default: 4).' },
        defaultWidth: { type: 'number', description: 'Default window width in pixels (default: 400).' },
        defaultHeight: { type: 'number', description: 'Default window height in pixels (default: 300).' },
      },
      required: ['windows'],
    },
    renderable: false,
  },
  {
    name: 'stack-layout',
    toolName: 'stack-layout',
    description: 'Stacked layout — windows in a vertical scroll or single-window mode.',
    inputSchema: {
      type: 'object',
      properties: {
        windows: { type: 'array', description: 'Array of ManagedWindow objects ({ id, title, visible?, weight? }).' },
        mode: { type: 'string', enum: ['single', 'scroll'], description: 'Display mode (default: "scroll").' },
        gap: { type: 'number', description: 'Gap in pixels between windows (default: 8).' },
        padding: { type: 'number', description: 'Outer padding in pixels (default: 0).' },
      },
      required: ['windows'],
    },
    renderable: false,
  },
  {
    name: 'pane',
    toolName: 'pane',
    description: 'Window pane with title bar, badge, fold/close/focus actions, and drag support.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique pane identifier.' },
        title: { type: 'string', description: 'Pane title in the title bar.' },
        badge: { type: 'string', description: 'Optional badge text next to the title.' },
        folded: { type: 'boolean', description: 'Whether the pane content is collapsed (default: false).' },
      },
      required: ['id', 'title'],
    },
    renderable: false,
  },

  // ── Agent UI ──────────────────────────────────────────────────────────────
  {
    name: 'llm-selector',
    toolName: 'llm-selector',
    description: 'Dropdown selector for LLM models grouped by type (remote, WASM, local).',
    inputSchema: {
      type: 'object',
      properties: {
        value: { type: 'string', description: 'Currently selected model value (e.g. "sonnet", "gemma-e2b").' },
        models: {
          type: 'array',
          items: { type: 'object', properties: {
            value: { type: 'string' }, label: { type: 'string' },
            group: { type: 'string', enum: ['remote', 'wasm', 'local'] },
          }, required: ['value', 'label', 'group'] },
          description: 'Custom model options. Defaults to Claude + Gemma models.',
        },
        class: { type: 'string' },
      },
      required: ['value'],
    },
    renderable: false,
  },
  {
    name: 'mcp-status',
    toolName: 'mcp-status',
    description: 'MCP connection status indicator (colored dot + label).',
    inputSchema: {
      type: 'object',
      properties: {
        connecting: { type: 'boolean', description: 'Whether connection is in progress.' },
        connected: { type: 'boolean', description: 'Whether currently connected.' },
        name: { type: 'string', description: 'Server name displayed when connected.' },
        class: { type: 'string' },
      },
      required: ['connecting', 'connected', 'name'],
    },
    renderable: false,
  },
  {
    name: 'mcp-connector',
    toolName: 'mcp-connector',
    description: 'MCP connection form with URL input, token field, connect/disconnect buttons, and status indicator.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'MCP server URL.' },
        token: { type: 'string', description: 'Bearer token (optional).' },
        connecting: { type: 'boolean' },
        connected: { type: 'boolean' },
        serverName: { type: 'string' },
        error: { type: 'string', description: 'Error message to display.' },
        compact: { type: 'boolean', description: 'Hide the token field (default: false).' },
        class: { type: 'string' },
      },
    },
    renderable: false,
  },
  {
    name: 'agent-progress',
    toolName: 'agent-progress',
    description: 'Agent progress bar showing elapsed time, tool call count, last tool name, and tokens/sec.',
    inputSchema: {
      type: 'object',
      properties: {
        active: { type: 'boolean', description: 'Whether the agent is actively running.' },
        elapsed: { type: 'number', description: 'Elapsed time in seconds.' },
        toolCalls: { type: 'number', description: 'Number of tool calls so far.' },
        lastTool: { type: 'string', description: 'Name of the last tool called.' },
        tokensEstimate: { type: 'number', description: 'Estimated tokens processed.' },
        class: { type: 'string' },
      },
      required: ['active', 'elapsed'],
    },
    renderable: false,
  },
  {
    name: 'gemma-loader',
    toolName: 'gemma-loader',
    description: 'Gemma WASM model loader showing download progress, ready state, and unload button.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['idle', 'loading', 'ready', 'error'], description: 'Current loading status.' },
        progress: { type: 'number', description: 'Download progress percentage (0-100).' },
        elapsed: { type: 'number', description: 'Elapsed loading time in seconds.' },
        loadedMB: { type: 'number', description: 'Megabytes downloaded so far.' },
        totalMB: { type: 'number', description: 'Total model size in megabytes.' },
        modelName: { type: 'string', description: 'Model display name (default: "Gemma E2B").' },
      },
      required: ['status', 'progress', 'elapsed'],
    },
    renderable: false,
  },
  {
    name: 'chat-panel',
    toolName: 'chat-panel',
    description: 'Full chat panel with message feed (bubbles + rendered blocks), agent progress bar, and input field.',
    inputSchema: {
      type: 'object',
      properties: {
        feed: {
          type: 'array',
          description: 'Array of ChatFeedItem: { kind: "bubble", role, html, id } or { kind: "block", id, type, data }.',
        },
        input: { type: 'string', description: 'Current input field value.' },
        generating: { type: 'boolean', description: 'Whether the agent is generating.' },
        timer: { type: 'number', description: 'Elapsed generation time in seconds.' },
        toolCount: { type: 'number', description: 'Number of tool calls during generation.' },
        lastTool: { type: 'string', description: 'Last tool called.' },
        placeholder: { type: 'string', description: 'Input placeholder text.' },
        showSrc: { type: 'boolean', description: 'Show block source labels.' },
        class: { type: 'string' },
      },
    },
    renderable: false,
  },
  {
    name: 'agent-console',
    toolName: 'agent-console',
    description: 'Collapsible console log viewer for agent debug output.',
    inputSchema: {
      type: 'object',
      properties: {
        logs: { type: 'array', items: { type: 'string' }, description: 'Array of log lines.' },
        open: { type: 'boolean', description: 'Whether the console is expanded (default: false).' },
        maxLines: { type: 'number', description: 'Maximum visible lines (default: 200).' },
        class: { type: 'string' },
      },
    },
    renderable: false,
  },
  {
    name: 'settings-panel',
    toolName: 'settings-panel',
    description: 'Agent settings panel with system prompt, max tokens, context limit, and cache toggle.',
    inputSchema: {
      type: 'object',
      properties: {
        systemPrompt: { type: 'string', description: 'System prompt text.' },
        maxTokens: { type: 'number', description: 'Max output tokens (256-8192, default: 4096).' },
        maxContextTokens: { type: 'number', description: 'Max context tokens (10K-200K, default: 150K).' },
        cacheEnabled: { type: 'boolean', description: 'Enable prompt caching (default: true).' },
        class: { type: 'string' },
      },
    },
    renderable: false,
  },
  {
    name: 'remote-mcp-servers',
    toolName: 'remote-mcp-servers',
    description: 'List of remote MCP demo servers with connect/disconnect per server and "connect all" button.',
    inputSchema: {
      type: 'object',
      properties: {
        servers: {
          type: 'array',
          items: { type: 'object', properties: {
            id: { type: 'string' }, name: { type: 'string' },
            description: { type: 'string' }, url: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          }, required: ['id', 'name', 'description', 'url'] },
          description: 'Array of available MCP servers.',
        },
        connectedUrls: { type: 'array', items: { type: 'string' }, description: 'URLs of currently connected servers.' },
        loading: { type: 'array', items: { type: 'string' }, description: 'URLs of servers currently connecting.' },
      },
      required: ['servers'],
    },
    renderable: false,
  },

  // ── Theme ─────────────────────────────────────────────────────────────────
  {
    name: 'theme-provider',
    toolName: 'theme-provider',
    description: 'Theme provider (dark/light). Wraps the app and injects CSS custom properties.',
    inputSchema: {
      type: 'object',
      properties: {
        defaultMode: { type: 'string', enum: ['light', 'dark'], description: 'Initial theme mode (default: "light").' },
        overrides: { type: 'object', description: 'Token overrides as { tokenName: value } (highest priority).' },
        theme: {
          type: 'object',
          description: 'Full ThemeJSON: { name?, tokens?, dark? }.',
          properties: {
            name: { type: 'string' },
            tokens: { type: 'object', description: 'Base token overrides.' },
            dark: { type: 'object', description: 'Dark-mode-only token overrides.' },
          },
        },
      },
    },
    renderable: false,
  },
];

for (const entry of EXTRA_COMPONENTS) {
  componentRegistry.set(entry.name, entry);
}

// ── Tool definition ──────────────────────────────────────────────────────────

export const COMPONENT_TOOL: AnthropicTool = {
  name: 'component',
  description:
    'Unified UI component tool. Call component("help") for the list of available components, ' +
    'component("help", "component_name") for the schema, or component("component_name", {...params}) to render.',
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: "Component name (e.g. 'stat-card') or 'help'.",
      },
      params: {
        description:
          "Component parameters (object) when rendering, or component name (string) when requesting help for a specific component.",
      },
    },
    required: ['name'],
  },
};

// ── Execution ────────────────────────────────────────────────────────────────

export function executeComponent(
  args: { name: string; params?: unknown },
  callbacks: AgentCallbacks,
): string {
  // ── Help mode ────────────────────────────────────────────────────────────
  if (args.name === 'help') {
    if (typeof args.params === 'string') {
      const comp = componentRegistry.get(args.params);
      if (!comp) {
        return JSON.stringify({ error: `Unknown component: ${args.params}. Call component("help") for the list.` });
      }
      return JSON.stringify({
        name: comp.name,
        description: comp.description,
        renderable: comp.renderable,
        schema: comp.inputSchema,
      });
    }
    // List all unique components (skip alias entries that share the same ComponentEntry)
    const seen = new Set<ComponentEntry>();
    const list: { name: string; description: string; renderable: boolean }[] = [];
    for (const entry of componentRegistry.values()) {
      if (seen.has(entry)) continue;
      seen.add(entry);
      list.push({ name: entry.name, description: entry.description, renderable: entry.renderable });
    }
    return JSON.stringify(list);
  }

  // ── Render mode ──────────────────────────────────────────────────────────
  const comp = componentRegistry.get(args.name);
  if (!comp) {
    return JSON.stringify({ error: `Unknown component: ${args.name}. Call component("help") for the list.` });
  }
  if (!comp.renderable) {
    return JSON.stringify({
      info: `"${comp.name}" is a Svelte component available for direct usage via @webmcp-auto-ui/ui. ` +
        'It cannot be rendered through the agent tool pipeline. ' +
        'Use renderable components (render_* tools) for agent-driven UI.',
      name: comp.name,
      description: comp.description,
      schema: comp.inputSchema,
    });
  }
  return executeUITool(
    comp.toolName,
    (args.params as Record<string, unknown>) ?? {},
    callbacks,
  );
}
