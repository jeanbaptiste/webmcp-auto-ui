// @webmcp-auto-ui/ui — public API

// Theme
export { default as ThemeProvider, getTheme } from './theme/ThemeProvider.svelte';
export type { ThemeJSON } from './theme/ThemeProvider.svelte';
export { DARK_TOKENS, LIGHT_TOKENS, THEME_MAP } from './theme/tokens.js';
export type { ThemeMode, ThemeOverrides, ThemeTokens } from './theme/tokens.js';
export { getUIScale, setUIScale, toggleUIScale, initUIScale, isUIScaled } from './theme/scale.js';
export type { UIScale, UIScaleKey } from './theme/scale.js';
export { default as HeaderControls } from './components/HeaderControls.svelte';

// Primitives
export { default as Card } from './primitives/Card.svelte';
export { default as GridLayout } from './primitives/GridLayout.svelte';
export { default as List } from './primitives/List.svelte';
export { default as Panel } from './primitives/Panel.svelte';
export { default as Window } from './primitives/Window.svelte';
export { default as MarkdownView } from './primitives/MarkdownView.svelte';
export { default as CodeView } from './primitives/CodeView.svelte';
export { renderMarkdown, highlightCode, createMarkdownRenderer } from './primitives/markdown-renderer.js';

// Simple widgets (vanilla renderers) — contract: render(container, data): () => void
export { render as renderStat }    from './widgets/simple/stat.js';
export { render as renderKv }      from './widgets/simple/kv.js';
export { render as renderList }    from './widgets/simple/list.js';
export { render as renderChart }   from './widgets/simple/chart.js';
export { render as renderAlert }   from './widgets/simple/alert.js';
export { render as renderCode }    from './widgets/simple/code.js';
export { render as renderText }    from './widgets/simple/text.js';
export { render as renderActions } from './widgets/simple/actions.js';
export { render as renderTags }    from './widgets/simple/tags.js';

// Rich widgets (vanilla renderers)
export { render as renderStatCard }      from './widgets/rich/stat-card.js';
export { render as renderDataTable }     from './widgets/rich/data-table.js';
export { render as renderTimeline }      from './widgets/rich/timeline.js';
export { render as renderProfile }       from './widgets/rich/profile.js';
export { render as renderTrombinoscope } from './widgets/rich/trombinoscope.js';
export { render as renderJsonViewer }    from './widgets/rich/json-viewer.js';
export { render as renderHemicycle }     from './widgets/rich/hemicycle.js';
export { render as renderChartRich }     from './widgets/rich/chart-rich.js';
export { render as renderCards }         from './widgets/rich/cards.js';
export { render as renderGridData }      from './widgets/rich/grid-data.js';
export { render as renderSankey }        from './widgets/rich/sankey.js';
export { render as renderMap }           from './widgets/rich/map.js';
export { render as renderD3 }            from './widgets/rich/d3.js';
export { render as renderJsSandbox }     from './widgets/rich/js-sandbox.js';
export { render as renderLog }           from './widgets/rich/log.js';
export { render as renderGallery }       from './widgets/rich/gallery.js';
export { render as renderCarousel }      from './widgets/rich/carousel.js';

// Notebook widget renderer (vanilla)
export { render as renderNotebook }             from './widgets/notebook/notebook.js';
export { render as renderRecipeBrowserWidget } from './widgets/notebook/recipe-browser.js';
// Notebook types (optional public API)
export type { NotebookState, NotebookCell } from './widgets/notebook/shared.js';
// Notebook cell extractors (for hosts that build notebooks from recipes/tools)
export { extractCellsFromRecipe, extractCellsFromTool, extractCellFromMarkdown, extractCellFromFence } from './widgets/notebook/resource-extractor.js';

// Safe image helper (URL validation + error fallback)
export { createSafeImage } from './widgets/helpers/safe-image.js';
export type { SafeImageOptions } from './widgets/helpers/safe-image.js';

// Widget export utility
export { exportWidget, getExportFormats, exportWidgetAs } from './widgets/export-widget.js';
export type { ExportFormat } from './widgets/export-widget.js';
export { default as ExportModal } from './widgets/ExportModal.svelte';

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
export { default as ModelLoader } from './agent/ModelLoader.svelte';
/** @deprecated Use ModelLoader instead. Alias maintained for backward compatibility. */
export { default as GemmaLoader } from './agent/ModelLoader.svelte';
export { default as McpStatus } from './agent/McpStatus.svelte';
export { default as ModelCacheManager } from './agent/ModelCacheManager.svelte';
export { default as AgentProgress } from './agent/AgentProgress.svelte';
export { default as McpConnector } from './agent/McpConnector.svelte';
export { default as ChatPanel } from './agent/ChatPanel.svelte';
export type { ChatFeedItem, ChatBubble, ChatBlock } from './agent/ChatPanel.svelte';
export { default as AgentConsole } from './agent/AgentConsole.svelte';
export { default as SettingsPanel } from './agent/SettingsPanel.svelte';
export { default as RemoteMCPserversDemo } from './agent/RemoteMCPserversDemo.svelte';
export { default as WebMCPserversList } from './agent/WebMCPserversList.svelte';
export { default as EphemeralBubble } from './agent/EphemeralBubble.svelte';
export { default as TokenBubble } from './agent/TokenBubble.svelte';
export { default as DiagnosticModal } from './agent/DiagnosticModal.svelte';
export { default as DiagnosticIcon } from './agent/DiagnosticIcon.svelte';
