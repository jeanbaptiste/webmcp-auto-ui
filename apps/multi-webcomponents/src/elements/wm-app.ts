// ---------------------------------------------------------------------------
// <wm-app> — shell principal (optionnel, pour composition top-level)
// ---------------------------------------------------------------------------

// This element is kept minimal — the layout is handled by index.html.
// <wm-app> exists as a convenience for embedding the full app in a single tag.

import './wm-mcp-connector.js';
import './wm-server-selector.js';
import './wm-chat.js';
import './wm-widget-grid.js';

export class WmApp extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
<style>
  :host {
    display: flex; flex-direction: column; height: 100%;
    background: var(--bg); color: var(--text1);
    font-family: var(--mono);
  }
  header {
    height: 48px; display: flex; align-items: center; gap: 12px;
    padding: 0 16px; border-bottom: 1px solid var(--border);
    background: var(--surface); flex-shrink: 0;
  }
  .logo { font-size: 14px; font-weight: 700; }
  .accent { color: var(--accent); }
  .shell {
    flex: 1; display: grid; overflow: hidden;
    grid-template-columns: 280px 1fr;
  }
  .sidebar {
    background: var(--surface); border-right: 1px solid var(--border);
    overflow-y: auto; padding: 12px;
  }
  .main { display: flex; flex-direction: column; overflow: hidden; }
</style>
<header>
  <span class="logo">Auto-UI <span class="accent">webcomponents</span></span>
</header>
<div class="shell">
  <aside class="sidebar">
    <wm-mcp-connector></wm-mcp-connector>
    <wm-server-selector></wm-server-selector>
  </aside>
  <main class="main">
    <wm-widget-grid></wm-widget-grid>
    <wm-chat></wm-chat>
  </main>
</div>
`;
  }
}

customElements.define('wm-app', WmApp);
