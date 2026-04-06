<script lang="ts">
	import { cn } from '../utils.js';

	type Props = {
		class?: string;
		children?: import('svelte').Snippet;
	};

	let { class: className, children }: Props = $props();
</script>

<div class={cn('flex justify-end gap-2 mt-4', className)}>
	{@render children?.()}
</div>
