<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { cn } from '../utils.js';

	type Props = {
		class?: string;
		children?: import('svelte').Snippet;
	};

	let { class: className, children }: Props = $props();
</script>

<Dialog.Portal>
	<Dialog.Overlay class="fixed inset-0 bg-black/70 z-50" />
	<Dialog.Content
		class={cn(
			'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-surface border border-border2 rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6',
			className
		)}
	>
		{@render children?.()}
	</Dialog.Content>
</Dialog.Portal>
