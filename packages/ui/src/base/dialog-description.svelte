<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { cn } from '../utils.js';

	type Props = {
		class?: string;
		children?: import('svelte').Snippet;
	};

	let { class: className, children }: Props = $props();
</script>

<Dialog.Description class={cn('text-xs text-text2 font-mono', className)}>
	{@render children?.()}
</Dialog.Description>
