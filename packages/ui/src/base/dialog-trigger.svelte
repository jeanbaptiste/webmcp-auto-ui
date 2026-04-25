<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { cn } from '../utils.js';

	type Props = {
		class?: string;
		children?: import('svelte').Snippet;
		onclick?: (e: MouseEvent) => void;
	};

	let { class: className, children: childrenSnippet, onclick }: Props = $props();
</script>

<Dialog.Trigger class={cn(className)} {onclick}>
	{@render childrenSnippet?.()}
</Dialog.Trigger>
