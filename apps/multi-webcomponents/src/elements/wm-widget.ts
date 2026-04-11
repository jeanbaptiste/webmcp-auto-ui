// ---------------------------------------------------------------------------
// <wm-widget type="" data="{}"> — renders a single widget via mountWidget
// ---------------------------------------------------------------------------

import { mountWidget } from '@webmcp-auto-ui/core';
import { getActiveServers } from '../lib/agent-setup.js';

export class WmWidget extends HTMLElement {
  static observedAttributes = ['type', 'data'];
  private cleanup?: () => void;

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.cleanup?.();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    this.cleanup?.();
    this.innerHTML = '';
    const type = this.getAttribute('type') || '';
    const data = JSON.parse(this.getAttribute('data') || '{}');
    if (!type) return;
    const result = mountWidget(this, type, data, getActiveServers());
    if (typeof result === 'function') {
      this.cleanup = result;
    }
  }

  /** Programmatic update without full re-render */
  updateData(data: Record<string, unknown>) {
    this.setAttribute('data', JSON.stringify(data));
  }
}

customElements.define('wm-widget', WmWidget);
