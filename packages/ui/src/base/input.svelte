<script lang="ts">
	import { cn } from '../utils.js';
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = HTMLInputAttributes & {
		class?: string;
		value?: string;
	};

	let { class: className, value = $bindable(''), ...rest }: Props = $props();
</script>

<input
	class={cn(
		'bg-surface2 border border-border2 rounded px-3 h-9 text-sm text-text1 font-mono outline-none focus:border-accent transition-colors placeholder:text-text2 w-full',
		className
	)}
	bind:value
	{...rest}
/>
