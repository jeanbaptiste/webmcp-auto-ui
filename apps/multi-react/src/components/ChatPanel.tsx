import { useState, useRef, useEffect } from 'react';
import type { MessageItem } from '../hooks/useAgent';

interface ChatPanelProps {
  messages: MessageItem[];
  sending: boolean;
  onSend: (text: string) => void;
}

export function ChatPanel({ messages, sending, onSend }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !sending) {
        onSend(input.trim());
        setInput('');
      }
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble chat-bubble--${m.role}`}>
            <span className="chat-role">{m.role}</span>
            <span className="chat-text">{m.content}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-bar">
        <input
          type="text"
          className="chat-input"
          placeholder={sending ? 'Generating...' : 'Ask for a widget...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="btn btn-accent"
          disabled={sending || !input.trim()}
          onClick={() => {
            if (input.trim()) {
              onSend(input.trim());
              setInput('');
            }
          }}
        >
          {sending ? 'Stop' : 'Send'}
        </button>
      </div>
    </div>
  );
}
