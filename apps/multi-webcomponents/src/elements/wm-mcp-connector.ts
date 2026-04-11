// ---------------------------------------------------------------------------
// <wm-mcp-connector> — URL input + connect button for MCP servers
// ---------------------------------------------------------------------------

import { connectMcp } from '../lib/agent-setup.js';
import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host { display: block; margin-bottom: 16px; }
  h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text2); margin-bottom: 8px; }
  .row { display: flex; gap: 6px; margin-bottom: 8px; }
  input {
    flex: 1; background: var(--surface2); border: 1px solid var(--border2);
    border-radius: var(--radius); padding: 6px 10px; font-size: 12px;
    font-family: var(--mono); color: var(--text1); outline: none;
  }
  input:focus { border-color: var(--accent); }
  input::placeholder { color: var(--text2); opacity: 0.5; }
  button {
    background: var(--accent); color: #fff; border: none; border-radius: var(--radius);
    padding: 6px 12px; font-size: 11px; font-family: var(--mono); cursor: pointer;
    white-space: nowrap;
  }
  button:hover { opacity: 0.85; }
  button.secondary {
    background: transparent; border: 1px solid var(--border2); color: var(--text2);
  }
  button.secondary:hover { color: var(--text1); border-color: var(--accent); }
  .presets { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .preset {
    font-size: 10px; padding: 3px 8px; border-radius: 4px;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text2); cursor: pointer; font-family: var(--mono);
  }
  .preset:hover { color: var(--accent); border-color: var(--accent); }
</style>
<h3>Connect MCP</h3>
<div class="row">
  <input type="text" placeholder="https://server/mcp" />
  <button class="connect">Go</button>
</div>
<button class="secondary add-all">Connect all demos</button>
<div class="presets"></div>
`;

export class WmMcpConnector extends HTMLElement {
  private input!: HTMLInputElement;

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this.input = shadow.querySelector('input')!;
    const connectBtn = shadow.querySelector('.connect')!;
    const addAllBtn = shadow.querySelector('.add-all')!;
    const presets = shadow.querySelector('.presets')!;

    connectBtn.addEventListener('click', () => this.doConnect());
    this.input.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.doConnect();
    });

    addAllBtn.addEventListener('click', async () => {
      for (const server of MCP_DEMO_SERVERS) {
        await connectMcp(server.url);
      }
    });

    // Render preset buttons
    for (const server of MCP_DEMO_SERVERS) {
      const btn = document.createElement('button');
      btn.className = 'preset';
      btn.textContent = server.name;
      btn.title = server.description;
      btn.addEventListener('click', () => connectMcp(server.url));
      presets.appendChild(btn);
    }
  }

  private doConnect() {
    const url = this.input.value.trim();
    if (url) {
      connectMcp(url);
      this.input.value = '';
    }
  }
}

customElements.define('wm-mcp-connector', WmMcpConnector);
