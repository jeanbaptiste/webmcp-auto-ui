<script lang="ts">
	import { cn } from '../utils.js';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	type Props = HTMLSelectAttributes & {
		class?: string;
	};

	let { class: className, children, ...rest }: Props = $props();
</script>

<select
	class={cn(
		'bg-surface2 border border-border2 rounded px-3 h-9 text-sm text-text2 font-mono outline-none cursor-pointer',
		className
	)}
	{...rest}
>
	{@render children?.()}
</select>
