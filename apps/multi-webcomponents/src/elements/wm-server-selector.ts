// ---------------------------------------------------------------------------
// <wm-server-selector> — shows connected MCP servers with disconnect buttons
// ---------------------------------------------------------------------------

import { listConnectedServers, disconnectMcp } from '../lib/agent-setup.js';
import { bus, Events } from '../lib/event-bus.js';

const style = `
<style>
  :host { display: block; margin-top: 12px; }
  h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text2); margin-bottom: 8px; }
  .empty { font-size: 11px; color: var(--text2); font-style: italic; }
  .server {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 8px; margin-bottom: 4px; border-radius: var(--radius);
    background: var(--surface2); border: 1px solid var(--border);
  }
  .server-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .server-name { font-size: 12px; color: var(--text1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .server-tools { font-size: 10px; color: var(--text2); }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); flex-shrink: 0; margin-right: 8px; }
  .disconnect {
    background: none; border: none; color: var(--text2); cursor: pointer;
    font-size: 14px; padding: 2px 6px; flex-shrink: 0;
  }
  .disconnect:hover { color: var(--accent2); }
</style>
`;

export class WmServerSelector extends HTMLElement {
  private unsub?: () => void;

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = style + '<h3>Connected servers</h3><div class="list"></div>';

    const update = () => this.render();
    const u1 = bus.on(Events.MCP_CONNECTED, update);
    const u2 = bus.on(Events.MCP_DISCONNECTED, update);
    const u3 = bus.on(Events.SERVERS_CHANGED, update);
    this.unsub = () => { u1(); u2(); u3(); };

    this.render();
  }

  disconnectedCallback() {
    this.unsub?.();
  }

  private render() {
    const list = this.shadowRoot!.querySelector('.list')!;
    const servers = listConnectedServers();

    if (servers.length === 0) {
      list.innerHTML = '<div class="empty">No servers connected</div>';
      return;
    }

    list.innerHTML = servers.map(s => `
      <div class="server" data-url="${s.url}">
        <span class="dot"></span>
        <div class="server-info">
          <span class="server-name">${s.name}</span>
          <span class="server-tools">${s.tools.length} tools</span>
        </div>
        <button class="disconnect" title="Disconnect">&times;</button>
      </div>
    `).join('');

    list.querySelectorAll('.disconnect').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = (e.target as HTMLElement).closest('.server')!.getAttribute('data-url')!;
        disconnectMcp(url);
      });
    });
  }
}

customElements.define('wm-server-selector', WmServerSelector);
