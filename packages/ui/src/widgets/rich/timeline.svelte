<svelte:options customElement={{ tag: 'auto-timeline', shadow: 'none' }} />

<script lang="ts">
  export interface TimelineEvent {
    date?: string;
    title?: string;
    description?: string;
    status?: 'done' | 'active' | 'pending';
    color?: string;
    href?: string;
    tags?: string[];
  }

  export interface TimelineData {
    title?: string;
    events?: TimelineEvent[];
  }

  interface Props {
    data?: TimelineData | null;
    oneventclick?: (e: TimelineEvent) => void;
  }

  let { data = {}, oneventclick }: Props = $props();

  const STATUS: Record<string, string> = {
    done: 'var(--color-teal)',
    active: 'var(--color-accent)',
    pending: 'var(--color-border2)',
  };

  const events = $derived<TimelineEvent[]>(
    Array.isArray(data?.events) && (data!.events as unknown[]).length
      ? data!.events as TimelineEvent[]
      : []
  );

  function handleEventActivate(event: TimelineEvent, e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      oneventclick?.(event);
    }
  }
</script>

<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if data?.title}<h3 class="text-sm font-semibold text-text1 mb-3">{data.title}</h3>{/if}
  {#if events.length === 0}
    <p class="text-text2 text-sm">No events</p>
  {:else}
    <div class="py-1">
      {#each events as event, i}
        {@const isLast = i === events.length - 1}
        {@const dotColor = event.color ?? STATUS[event.status ?? 'pending'] ?? 'var(--color-border2)'}
        <div
          class="flex gap-4 relative {!isLast ? 'pb-5' : ''} {oneventclick ? 'cursor-pointer' : ''}"
          role={oneventclick ? 'button' : undefined}
          tabindex={oneventclick ? 0 : undefined}
          aria-label={oneventclick ? `${event.title ?? 'Event'} — ${event.date ?? ''}` : undefined}
          title={oneventclick ? 'Double-cliquez pour interagir' : undefined}
          ondblclick={() => oneventclick?.(event)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); oneventclick?.(event); } }}
        >
          <div class="flex flex-col items-center flex-shrink-0">
            <div
              class="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
              style="background:{dotColor};{event.status === 'active' ? `box-shadow:0 0 0 3px ${dotColor}33;` : ''}"
            ></div>
            {#if !isLast}<div class="w-0.5 flex-1 bg-border mt-1"></div>{/if}
          </div>
          <div class="flex-1 min-w-0 pb-1">
            <div class="text-xs text-text2 mb-0.5">{event.date ?? ''}</div>
            <div class="font-semibold text-text1 text-sm">
              {#if event.href}
                <a href={event.href} class="text-accent no-underline hover:underline">{event.title ?? ''}</a>
              {:else}
                {event.title ?? ''}
              {/if}
            </div>
            {#if event.description}
              <div class="text-sm text-text2 mt-0.5">{event.description}</div>
            {/if}
            {#if event.tags?.length}
              <div class="flex gap-1 flex-wrap mt-1">
                {#each event.tags as tag}
                  <span class="text-xs bg-surface2 text-text2 px-1.5 py-0.5 rounded">{tag}</span>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
