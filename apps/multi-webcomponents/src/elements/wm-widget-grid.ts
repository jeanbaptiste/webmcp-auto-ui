// ---------------------------------------------------------------------------
// <wm-widget-grid> — grid layout for dynamically added widgets
// ---------------------------------------------------------------------------

import { bus, Events } from '../lib/event-bus.js';
import './wm-widget.js';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block; flex: 1; overflow-y: auto; padding: 16px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
    align-content: start;
  }
  .cell {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 12px; min-height: 80px;
    overflow: hidden; position: relative;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cell .close {
    position: absolute; top: 4px; right: 6px;
    background: none; border: none; color: var(--text2);
    cursor: pointer; font-size: 14px; padding: 2px 4px;
    opacity: 0; transition: opacity 0.15s;
  }
  .cell:hover .close { opacity: 1; }
  .cell .close:hover { color: var(--accent2); }
  .empty {
    display: flex; align-items: center; justify-content: center;
    min-height: 200px; color: var(--text2); font-size: 13px;
    font-style: italic;
  }
</style>
<div class="grid"></div>
`;

export class WmWidgetGrid extends HTMLElement {
  private gridEl!: HTMLDivElement;
  private widgets = new Map<string, HTMLElement>();
  private unsubs: (() => void)[] = [];

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.gridEl = shadow.querySelector('.grid')!;

    this.showEmpty();

    this.unsubs.push(
      bus.on(Events.WIDGET_ADD, ({ id, type, data }: { id: string; type: string; data: Record<string, unknown> }) => {
        this.addWidget(id, type, data);
      }),
      bus.on(Events.WIDGET_CLEAR, () => {
        this.clearAll();
      }),
      bus.on(Events.WIDGET_UPDATE, ({ id, data }: { id: string; data: Record<string, unknown> }) => {
        const cell = this.widgets.get(id);
        if (cell) {
          const wm = cell.querySelector('wm-widget') as any;
          wm?.updateData(data);
        }
      }),
    );
  }

  disconnectedCallback() {
    this.unsubs.forEach(u => u());
  }

  private showEmpty() {
    if (this.widgets.size === 0) {
      this.gridEl.innerHTML = '<div class="empty">Widgets will appear here...</div>';
    }
  }

  private addWidget(id: string, type: string, data: Record<string, unknown>) {
    // Remove empty placeholder
    const empty = this.gridEl.querySelector('.empty');
    if (empty) empty.remove();

    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.id = id;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      cell.remove();
      this.widgets.delete(id);
      this.showEmpty();
    });

    const widget = document.createElement('wm-widget');
    widget.setAttribute('type', type);
    widget.setAttribute('data', JSON.stringify(data));

    cell.appendChild(closeBtn);
    cell.appendChild(widget);
    this.gridEl.appendChild(cell);
    this.widgets.set(id, cell);
  }

  private clearAll() {
    this.gridEl.innerHTML = '';
    this.widgets.clear();
    this.showEmpty();
  }
}

customElements.define('wm-widget-grid', WmWidgetGrid);
