// ---------------------------------------------------------------------------
// main.ts — Entry point: register Custom Elements + auto-register widgets
// ---------------------------------------------------------------------------

// Register all custom elements (side-effect imports)
import './elements/wm-app.js';
import './elements/wm-mcp-connector.js';
import './elements/wm-server-selector.js';
import './elements/wm-chat.js';
import './elements/wm-widget.js';
import './elements/wm-widget-grid.js';

// Auto-register all vanilla widgets as <wm-{name}> custom elements
import { autouivanilla } from '@webmcp-auto-ui/widgets-vanilla';
import { d3server } from '@webmcp-auto-ui/widgets-d3';
import { mermaidServer } from '@webmcp-auto-ui/widgets-mermaid';
import type { WebMcpServer } from '@webmcp-auto-ui/core';

function registerWidgetsAsElements(server: WebMcpServer, prefix: string = 'wm') {
  for (const widget of server.listWidgets()) {
    const tagName = `${prefix}-${widget.name}`;
    // Skip if already defined (e.g. wm-widget is our own element)
    if (customElements.get(tagName)) continue;

    customElements.define(tagName, class extends HTMLElement {
      connectedCallback() {
        const data = JSON.parse(this.dataset.props ?? '{}');
        if (typeof widget.renderer === 'function') {
          (widget.renderer as (container: HTMLElement, data: Record<string, unknown>) => void)(this, data);
        }
      }
    });
  }
}

registerWidgetsAsElements(autouivanilla);
registerWidgetsAsElements(d3server, 'wm-d3');
registerWidgetsAsElements(mermaidServer, 'wm-mermaid');

// Log registered elements
console.log(
  '[webmcp] Custom elements registered:',
  autouivanilla.listWidgets().map(w => `wm-${w.name}`).join(', '),
);
console.log(
  '[webmcp] D3 widgets:',
  d3server.listWidgets().map(w => `wm-d3-${w.name}`).join(', '),
);
console.log(
  '[webmcp] Mermaid widgets:',
  mermaidServer.listWidgets().map(w => `wm-mermaid-${w.name}`).join(', '),
);
