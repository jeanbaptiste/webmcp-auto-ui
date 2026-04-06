<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const badgeVariants = tv({
		base: 'inline-flex items-center rounded-full font-mono font-medium',
		variants: {
			variant: {
				default: 'bg-accent/10 text-accent',
				success: 'bg-teal/10 text-teal',
				warning: 'bg-amber/10 text-amber',
				destructive: 'bg-accent2/10 text-accent2',
				outline: 'border border-border2 text-text2 bg-transparent'
			},
			size: {
				sm: 'text-xs px-1.5 py-0.5',
				default: 'text-xs px-2.5 py-0.5'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
	export type BadgeSize = VariantProps<typeof badgeVariants>['size'];
</script>

<script lang="ts">
	import { cn } from '../utils.js';

	type Props = {
		variant?: BadgeVariant;
		size?: BadgeSize;
		class?: string;
		children?: import('svelte').Snippet;
	};

	let { variant = 'default', size = 'default', class: className, children }: Props = $props();
</script>

<span class={cn(badgeVariants({ variant, size }), className)}>
	{@render children?.()}
</span>
