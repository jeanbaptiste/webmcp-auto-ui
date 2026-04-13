// @webmcp-auto-ui/ui — public API

// Theme
export { default as ThemeProvider, getTheme } from './theme/ThemeProvider.svelte';
export type { ThemeJSON } from './theme/ThemeProvider.svelte';
export { DARK_TOKENS, LIGHT_TOKENS, THEME_MAP } from './theme/tokens.js';
export type { ThemeMode, ThemeOverrides, ThemeTokens } from './theme/tokens.js';

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
export { default as D3Widget } from './widgets/rich/D3Widget.svelte';
export { default as JsSandbox } from './widgets/rich/JsSandbox.svelte';
export { default as LogViewer } from './widgets/rich/LogViewer.svelte';
export { default as Gallery } from './widgets/rich/Gallery.svelte';
export { default as Carousel } from './widgets/rich/Carousel.svelte';

// Safe image (URL validation + error fallback)
export { default as SafeImage } from './widgets/SafeImage.svelte';

// Dispatcher
export { default as BlockRenderer } from './widgets/BlockRenderer.svelte';
export { default as WidgetRenderer } from './widgets/WidgetRenderer.svelte';

// Link overlay (SVG arrows between linked widgets)
export { default as LinkOverlay } from './widgets/LinkOverlay.svelte';

// Window Manager
export { default as Pane } from './wm/Pane.svelte';
export { default as TilingLayout } from './wm/TilingLayout.svelte';
export { default as FloatingLayout } from './wm/FloatingLayout.svelte';
export { default as StackLayout } from './wm/StackLayout.svelte';
export { default as FlexLayout } from './wm/FlexLayout.svelte';
export { default as LinkIndicators } from './wm/LinkIndicators.svelte';
export { groupColor as linkGroupColor } from './wm/link-utils.js';

// Base components (shadcn-svelte pattern)
export { Button, buttonVariants, Input, Badge, badgeVariants, NativeSelect, Tooltip } from './base/index.js';
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './base/index.js';

// WM types
export type { ManagedWindow, LayoutWindow, FloatingWindowState } from './lib/wm-layouts.js';

// Layout adapter (for agent tools: move_block, resize_block, style_block)
export { layoutAdapter } from './wm/layout-adapter.js';

// FONC message bus
export { bus } from './messaging/bus.svelte.js';
export type { BusMessage } from './messaging/bus.svelte.js';

// Agent UI components
export { default as LLMSelector } from './agent/LLMSelector.svelte';
export { default as GemmaLoader } from './agent/GemmaLoader.svelte';
export { default as McpStatus } from './agent/McpStatus.svelte';
export { default as AgentProgress } from './agent/AgentProgress.svelte';
export { default as McpConnector } from './agent/McpConnector.svelte';
export { default as ChatPanel } from './agent/ChatPanel.svelte';
export type { ChatFeedItem, ChatBubble, ChatBlock } from './agent/ChatPanel.svelte';
export { default as AgentConsole } from './agent/AgentConsole.svelte';
export { default as SettingsPanel } from './agent/SettingsPanel.svelte';
export { default as RemoteMCPserversDemo } from './agent/RemoteMCPserversDemo.svelte';
export { default as EphemeralBubble } from './agent/EphemeralBubble.svelte';
export { default as TokenBubble } from './agent/TokenBubble.svelte';
export { default as DiagnosticModal } from './agent/DiagnosticModal.svelte';
export { default as DiagnosticIcon } from './agent/DiagnosticIcon.svelte';
