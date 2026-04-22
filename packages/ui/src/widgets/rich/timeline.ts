export interface TimelineEvent {
  date?: string;
  title?: string;
  description?: string;
  status?: 'done' | 'active' | 'pending';
  color?: string;
  href?: string;
  tags?: string[];
}

export interface TimelineSpec {
  title?: string;
  events?: TimelineEvent[];
}

const STATUS: Record<string, string> = {
  done: 'var(--color-teal)',
  active: 'var(--color-accent)',
  pending: 'var(--color-border2)',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function resolveEvents(spec: Partial<TimelineSpec>, data: unknown): TimelineEvent[] {
  if (Array.isArray(spec.events) && spec.events.length) return spec.events;
  if (Array.isArray(data)) return data as TimelineEvent[];
  return [];
}

function renderEvent(event: TimelineEvent, index: number, isLast: boolean, interactive: boolean): string {
  const dotColor = event.color ?? STATUS[event.status ?? 'pending'] ?? 'var(--color-border2)';
  const activeShadow = event.status === 'active' ? `box-shadow:0 0 0 3px ${dotColor}33;` : '';
  const pbClass = !isLast ? 'pb-5' : '';
  const cursorClass = interactive ? 'cursor-pointer' : '';
  const role = interactive ? ' role="button"' : '';
  const tabindex = interactive ? ' tabindex="0"' : '';
  const title = interactive ? ' title="Double-cliquez pour interagir"' : '';

  const titleHtml = event.href
    ? `<a href="${escapeAttr(event.href)}" class="text-accent no-underline hover:underline">${escapeHtml(event.title ?? '')}</a>`
    : escapeHtml(event.title ?? '');

  const descriptionHtml = event.description
    ? `<div class="text-sm text-text2 mt-0.5">${escapeHtml(event.description)}</div>`
    : '';

  const tagsHtml = event.tags?.length
    ? `<div class="flex gap-1 flex-wrap mt-1">${event.tags
        .map(
          (tag) =>
            `<span class="text-xs bg-surface2 text-text2 px-1.5 py-0.5 rounded">${escapeHtml(tag)}</span>`
        )
        .join('')}</div>`
    : '';

  const connector = !isLast ? `<div class="w-0.5 flex-1 bg-border mt-1"></div>` : '';

  return `
    <div class="flex gap-4 relative ${pbClass} ${cursorClass}" data-event-index="${index}"${role}${tabindex}${title}>
      <div class="flex flex-col items-center flex-shrink-0">
        <div class="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style="background:${dotColor};${activeShadow}"></div>
        ${connector}
      </div>
      <div class="flex-1 min-w-0 pb-1">
        <div class="text-xs text-text2 mb-0.5">${escapeHtml(event.date ?? '')}</div>
        <div class="font-semibold text-text1 text-sm">${titleHtml}</div>
        ${descriptionHtml}
        ${tagsHtml}
      </div>
    </div>
  `;
}

export function render(container: HTMLElement, data: any): () => void {
  const spec: Partial<TimelineSpec> =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data.spec && typeof data.spec === 'object' ? data.spec : data)
      : {};
  const rawData =
    data && typeof data === 'object' && !Array.isArray(data) && 'data' in data
      ? (data as any).data
      : data;

  const events = resolveEvents(spec, rawData);
  const interactive = true;

  const titleHtml = spec.title
    ? `<h3 class="text-sm font-semibold text-text1 mb-3">${escapeHtml(spec.title)}</h3>`
    : '';

  if (events.length === 0) {
    container.innerHTML = `
      <div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
        ${titleHtml}
        <p class="text-text2 text-sm">No events</p>
      </div>
    `;
    return () => {
      container.innerHTML = '';
    };
  }

  const eventsHtml = events
    .map((event, i) => renderEvent(event, i, i === events.length - 1, interactive))
    .join('');

  container.innerHTML = `
    <div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
      ${titleHtml}
      <div class="py-1">${eventsHtml}</div>
    </div>
  `;

  const root = container.firstElementChild as HTMLElement | null;

  const dispatch = (index: number) => {
    const event = events[index];
    if (!event) return;
    container.dispatchEvent(
      new CustomEvent('widget:interact', {
        detail: { action: 'eventclick', payload: event },
        bubbles: true,
      })
    );
  };

  const findIndex = (target: EventTarget | null): number | null => {
    let el = target as HTMLElement | null;
    while (el && el !== root) {
      if (el.dataset && el.dataset.eventIndex !== undefined) {
        const n = Number(el.dataset.eventIndex);
        return Number.isFinite(n) ? n : null;
      }
      el = el.parentElement;
    }
    return null;
  };

  const onDblClick = (e: Event) => {
    const i = findIndex(e.target);
    if (i !== null) {
      dispatch(i);
      e.stopPropagation();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const i = findIndex(e.target);
    if (i !== null) {
      dispatch(i);
      e.stopPropagation();
    }
  };

  if (root) {
    root.addEventListener('dblclick', onDblClick);
    root.addEventListener('keydown', onKeyDown);
  }

  return () => {
    if (root) {
      root.removeEventListener('dblclick', onDblClick);
      root.removeEventListener('keydown', onKeyDown);
    }
    container.innerHTML = '';
  };
}
