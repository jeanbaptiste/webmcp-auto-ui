---
title: Multi-Svelte
description: Multi-widget Svelte demo with configurable sidebar, multi-MCP, Gemma WASM, float/grid layouts and token tracking
sidebar:
  order: 7
---

Multi-Svelte (`apps/multi-svelte/`) is the most complete demo of the webmcp-auto-ui architecture. It combines a configuration sidebar, a multi-provider AI agent (Claude + Gemma WASM), multi-MCP connection, and two layout modes for widgets.

## Features

- **Multi-provider**: `RemoteLLMProvider` (Claude via proxy) and `WasmProvider` (Gemma in-browser)
- **Multi-MCP**: simultaneous connection to multiple MCP servers with optional token
- **Server packs**: local widget pack selector (autoui, vanilla) that can be toggled on/off
- **Layouts**: float mode (draggable/resizable windows) and grid mode (responsive grid)
- **Token tracking**: `TokenTracker` with real-time display via `TokenBubble`
- **Configurable sidebar**: LLM model, MCP server, packs, max tokens, max tools, temperature, prompt cache, custom system prompt
- **Agent logs**: collapsible panel with iteration history, tool calls and metrics
- **Inter-widget links**: `LinkIndicators` and `linkGroupColor` for relationship visualization
- **HyperSkill**: automatic loading from URL parameter `?hs=`
- **Gemma WASM**: in-browser loading with progress bar via `GemmaLoader`
- **Ephemeral bubbles**: temporary display of agent responses via `EphemeralBubble`

## Architecture

```
multi-svelte/
  src/
    routes/
      +page.svelte           -- Main page with sidebar, canvas, chat
      api/chat/+server.ts    -- Server-side Anthropic proxy
    lib/
      agent-setup.ts         -- Server packs, layer construction
      ServerSelector.svelte  -- Pack selection component
```

The app uses the packages:
- `@webmcp-auto-ui/agent`: `runAgentLoop`, `RemoteLLMProvider`, `WasmProvider`, `buildSystemPrompt`, `fromMcpTools`, `trimConversationHistory`, `TokenTracker`
- `@webmcp-auto-ui/core`: `McpMultiClient` for multi-MCP connection
- `@webmcp-auto-ui/sdk`: canvas store for reactive state
- `@webmcp-auto-ui/ui`: `McpStatus`, `GemmaLoader`, `AgentProgress`, `EphemeralBubble`, `TokenBubble`, `LLMSelector`, `FloatingLayout`, `FlexLayout`, `WidgetRenderer`, `LinkIndicators`, `bus`, `layoutAdapter`

## Usage

```bash
npm -w apps/multi-svelte run dev
```

1. Configure the LLM model in the sidebar (Claude haiku/sonnet/opus or Gemma WASM)
2. Connect one or more MCP servers
3. Enable/disable local widget packs
4. Ask a question in natural language
5. The agent generates widgets on the canvas (float or grid mode)
6. View agent logs and token metrics in real time

## Live demo

[demos.hyperskills.net/multi-svelte](https://demos.hyperskills.net/multi-svelte/)
