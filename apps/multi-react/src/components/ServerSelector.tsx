import type { ServerOption } from '../hooks/useServers';

interface ServerSelectorProps {
  options: ServerOption[];
  onToggle: (id: string) => void;
}

export function ServerSelector({ options, onToggle }: ServerSelectorProps) {
  return (
    <div className="server-selector">
      {options.map((opt) => (
        <label key={opt.id} className="server-checkbox">
          <input
            type="checkbox"
            checked={opt.enabled}
            onChange={() => onToggle(opt.id)}
          />
          <span className="server-label">
            {opt.label}
            <span className="server-count">{opt.widgetCount}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
