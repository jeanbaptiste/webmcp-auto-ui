<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { cn } from '../utils.js';

	type Props = {
		class?: string;
		children?: import('svelte').Snippet;
	};

	let { class: className, children }: Props = $props();
</script>

<Dialog.Title class={cn('text-sm font-mono text-text1', className)}>
	{@render children?.()}
</Dialog.Title>
