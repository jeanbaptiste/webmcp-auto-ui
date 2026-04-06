<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import { cn } from '../utils.js';

	type Props = {
		content: string;
		class?: string;
		children?: import('svelte').Snippet;
	};

	let { content, class: className, children }: Props = $props();
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger>
			{@render children?.()}
		</Tooltip.Trigger>
		<Tooltip.Content
			class={cn(
				'bg-surface border border-border2 rounded px-2 py-1 text-xs font-mono text-text1 shadow-lg z-50',
				className
			)}
		>
			{content}
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
