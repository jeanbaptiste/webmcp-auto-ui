<script lang="ts">
	import { Dialog } from 'bits-ui';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children?: import('svelte').Snippet;
	};

	let { open = $bindable(false), onOpenChange, children }: Props = $props();
</script>

<Dialog.Root bind:open {onOpenChange}>
	{@render children?.()}
</Dialog.Root>
