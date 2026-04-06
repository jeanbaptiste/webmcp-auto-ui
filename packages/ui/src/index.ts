// @webmcp-auto-ui/ui — public API

// Primitives
export { default as Card } from './primitives/Card.svelte';
export { default as GridLayout } from './primitives/GridLayout.svelte';
export { default as List } from './primitives/List.svelte';
export { default as Panel } from './primitives/Panel.svelte';
export { default as Window } from './primitives/Window.svelte';

// Simple widgets (PJ blocks)
export { default as StatBlock } from './widgets/simple/StatBlock.svelte';
export { default as KVBlock } from './widgets/simple/KVBlock.svelte';
export { default as ListBlock } from './widgets/simple/ListBlock.svelte';
export { default as ChartBlock } from './widgets/simple/ChartBlock.svelte';
export { default as AlertBlock } from './widgets/simple/AlertBlock.svelte';
export { default as CodeBlock } from './widgets/simple/CodeBlock.svelte';
export { default as TextBlock } from './widgets/simple/TextBlock.svelte';
export { default as ActionsBlock } from './widgets/simple/ActionsBlock.svelte';
export { default as TagsBlock } from './widgets/simple/TagsBlock.svelte';

// Rich widgets (Archive)
export { default as StatCard } from './widgets/rich/StatCard.svelte';
export { default as DataTable } from './widgets/rich/DataTable.svelte';
export { default as Timeline } from './widgets/rich/Timeline.svelte';
export { default as ProfileCard } from './widgets/rich/ProfileCard.svelte';
export { default as Trombinoscope } from './widgets/rich/Trombinoscope.svelte';
export { default as JsonViewer } from './widgets/rich/JsonViewer.svelte';
export { default as Hemicycle } from './widgets/rich/Hemicycle.svelte';
export { default as Chart } from './widgets/rich/Chart.svelte';
export { default as Cards } from './widgets/rich/Cards.svelte';
export { default as GridData } from './widgets/rich/GridData.svelte';
export { default as Sankey } from './widgets/rich/Sankey.svelte';
export { default as MapView } from './widgets/rich/MapView.svelte';
export { default as LogViewer } from './widgets/rich/LogViewer.svelte';

// Dispatcher
export { default as BlockRenderer } from './widgets/BlockRenderer.svelte';

// Window Manager
export { default as Pane } from './wm/Pane.svelte';
export { default as TilingLayout } from './wm/TilingLayout.svelte';
export { default as FloatingLayout } from './wm/FloatingLayout.svelte';
export { default as StackLayout } from './wm/StackLayout.svelte';

// WM types
export type { ManagedWindow, LayoutWindow, FloatingWindowState } from './lib/wm-layouts.js';
