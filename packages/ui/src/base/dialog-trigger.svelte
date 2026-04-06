<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { cn } from '../utils.js';

	type Props = {
		class?: string;
		children?: import('svelte').Snippet;
	};

	let { class: className, children: childrenSnippet }: Props = $props();
</script>

<Dialog.Trigger class={cn(className)}>
	{@render childrenSnippet?.()}
</Dialog.Trigger>
