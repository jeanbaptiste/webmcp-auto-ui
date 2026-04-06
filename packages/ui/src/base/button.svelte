<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: 'inline-flex items-center justify-center rounded font-mono text-sm font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
		variants: {
			variant: {
				default: 'bg-accent text-white hover:bg-accent/90',
				outline: 'border border-border2 text-text2 hover:border-accent hover:text-text1 bg-transparent',
				ghost: 'hover:bg-surface2 text-text2 bg-transparent',
				destructive: 'bg-accent2 text-white hover:bg-accent2/90'
			},
			size: {
				sm: 'h-8 px-3 text-xs',
				default: 'h-9 px-4 text-sm',
				lg: 'h-10 px-6',
				icon: 'h-9 w-9'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];
</script>

<script lang="ts">
	import { cn } from '../utils.js';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
	};

	let { variant = 'default', size = 'default', class: className, children, ...rest }: Props = $props();
</script>

<button class={cn(buttonVariants({ variant, size }), className)} {...rest}>
	{@render children?.()}
</button>
