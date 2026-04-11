// ---------------------------------------------------------------------------
// <wm-chat> — chat input + message display
// ---------------------------------------------------------------------------

import { sendMessage, isGenerating, abort } from '../lib/agent-setup.js';
import { bus, Events } from '../lib/event-bus.js';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: flex; flex-direction: column;
    flex-shrink: 0; border-top: 1px solid var(--border);
    background: var(--surface); max-height: 50%;
  }
  .messages {
    flex: 1; overflow-y: auto; padding: 12px 16px;
    display: flex; flex-direction: column; gap: 8px;
    min-height: 60px; max-height: 200px;
  }
  .msg {
    font-size: 12px; line-height: 1.5; padding: 6px 10px;
    border-radius: var(--radius); max-width: 85%; word-break: break-word;
    white-space: pre-wrap;
  }
  .msg.user {
    align-self: flex-end; background: var(--accent); color: #fff;
  }
  .msg.assistant {
    align-self: flex-start; background: var(--surface2);
    border: 1px solid var(--border); color: var(--text1);
  }
  .msg.tool {
    align-self: flex-start; font-size: 10px; color: var(--teal);
    background: transparent; padding: 2px 10px; opacity: 0.7;
  }
  .progress {
    font-size: 10px; color: var(--accent); padding: 4px 16px;
    display: none; align-items: center; gap: 6px;
  }
  .progress.active { display: flex; }
  .progress .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent); animation: pulse 1s infinite;
  }
  @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
  .input-row {
    display: flex; gap: 8px; padding: 12px 16px;
    border-top: 1px solid var(--border);
  }
  input {
    flex: 1; background: var(--surface2); border: 1px solid var(--border2);
    border-radius: var(--radius); padding: 10px 16px; font-size: 13px;
    font-family: var(--mono); color: var(--text1); outline: none;
  }
  input:focus { border-color: var(--accent); }
  input::placeholder { color: var(--text2); opacity: 0.5; }
  input:disabled { opacity: 0.5; cursor: not-allowed; }
  button {
    background: var(--accent); color: #fff; border: none; border-radius: var(--radius);
    padding: 10px 16px; font-size: 12px; font-family: var(--mono); cursor: pointer;
    white-space: nowrap;
  }
  button:hover { opacity: 0.85; }
  button.stop { background: var(--accent2); display: none; }
  button.stop.active { display: block; }
</style>
<div class="messages"></div>
<div class="progress">
  <span class="dot"></span>
  <span class="label">Generating...</span>
</div>
<div class="input-row">
  <input type="text" placeholder="Ask the agent to build a UI..." />
  <button class="stop">Stop</button>
</div>
`;

export class WmChat extends HTMLElement {
  private messagesEl!: HTMLDivElement;
  private inputEl!: HTMLInputElement;
  private progressEl!: HTMLDivElement;
  private stopBtn!: HTMLButtonElement;
  private unsubs: (() => void)[] = [];

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this.messagesEl = shadow.querySelector('.messages')!;
    this.inputEl = shadow.querySelector('input')!;
    this.progressEl = shadow.querySelector('.progress')!;
    this.stopBtn = shadow.querySelector('.stop')!;

    // Input handling
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.doSend();
      }
    });

    this.stopBtn.addEventListener('click', () => abort());

    // Bus listeners
    this.unsubs.push(
      bus.on(Events.AGENT_TEXT, ({ text }: { text: string }) => {
        this.setLastAssistantMsg(text);
      }),
      bus.on(Events.AGENT_START, () => {
        this.progressEl.classList.add('active');
        this.inputEl.disabled = true;
        this.stopBtn.classList.add('active');
      }),
      bus.on(Events.AGENT_DONE, () => {
        this.progressEl.classList.remove('active');
        this.inputEl.disabled = false;
        this.stopBtn.classList.remove('active');
        this.inputEl.focus();
      }),
      bus.on(Events.TOOL_CALL, ({ name }: { name: string }) => {
        this.addMsg('tool', `> ${name}`);
      }),
    );
  }

  disconnectedCallback() {
    this.unsubs.forEach(u => u());
  }

  private doSend() {
    const text = this.inputEl.value.trim();
    if (!text || isGenerating()) return;
    this.inputEl.value = '';
    this.addMsg('user', text);
    this.addMsg('assistant', '...');
    sendMessage(text);
  }

  private addMsg(role: string, content: string) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = content;
    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private setLastAssistantMsg(text: string) {
    const msgs = this.messagesEl.querySelectorAll('.msg.assistant');
    const last = msgs[msgs.length - 1];
    if (last) {
      last.textContent = text;
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
  }
}

customElements.define('wm-chat', WmChat);
