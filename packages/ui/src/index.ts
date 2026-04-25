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

// Recipe building blocks (used by RecipeModal and notebook recipe-viewer)
export { default as RecipeCodeBlock } from './recipe/RecipeCodeBlock.svelte';
export type { RecipeBlockAction } from './recipe/types.js';

// Widgets are shipped as Svelte 5 custom elements — import the widget file
// side-effect to register its tag (e.g. `import '@webmcp-auto-ui/ui/widgets/simple/stat.svelte';`
// then use `<auto-stat data={spec}></auto-stat>`). `WidgetRenderer` does this for you.

// Notebook vanilla renderer (kept — notebook is wrapped by a custom element that
// delegates to the legacy vanilla code; full Svelte rewrite is Phase 3).
export { render as renderNotebook } from './widgets/notebook/notebook.js';
// Notebook types (optional public API)
export type { NotebookState, NotebookCell } from './widgets/notebook/shared.js';
// Notebook cell extractors (for hosts that build notebooks from recipes/tools)
export { extractCellsFromRecipe, extractCellsFromTool, extractCellFromMarkdown, extractCellFromFence } from './widgets/notebook/resource-extractor.js';

// Safe image Svelte component — prefer this in .svelte code over the legacy helper.
export { default as SafeImage } from './widgets/SafeImage.svelte';

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
export { default as MCPserversList } from './agent/MCPserversList.svelte';
/** @deprecated Use MCPserversList instead. Alias kept for backward compatibility. */
export { default as RemoteMCPserversDemo } from './agent/RemoteMCPserversDemo.svelte';
export { default as WebMCPserversList } from './agent/WebMCPserversList.svelte';
export { default as RecipeBrowser } from './agent/RecipeBrowser.svelte';
export { default as ToolBrowser } from './agent/ToolBrowser.svelte';
export { default as EphemeralBubble } from './agent/EphemeralBubble.svelte';
export { default as TokenBubble } from './agent/TokenBubble.svelte';
export { default as DiagnosticModal } from './agent/DiagnosticModal.svelte';
export { default as DiagnosticIcon } from './agent/DiagnosticIcon.svelte';
