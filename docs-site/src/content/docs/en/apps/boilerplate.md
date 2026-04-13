---
title: Boilerplate
description: SvelteKit template with 3 Tricoteuses widgets (FicheDepute, ResultatScrutin, Amendement) — starting point for integrating webmcp-auto-ui
sidebar:
  order: 0
---

Boilerplate (`apps/boilerplate/`) is the starter template for integrating webmcp-auto-ui into a SvelteKit project. It includes 3 custom widgets registered via `createWebMcpServer` and a complete interface with AI agent, MCP connection and widget rendering.

## Features

- **3 Tricoteuses widgets**: FicheDepute, ResultatScrutin, Amendement — registered as a local WebMCP server
- **AI agent**: agent loop via `runAgentLoop` with `RemoteLLMProvider` (Anthropic proxy)
- **Multi-MCP**: connection to one or more remote MCP servers via `McpMultiClient`
- **ToolLayers**: remote MCP layers + local WebMCP server + native autoui
- **UI components**: `LLMSelector`, `McpStatus`, `AgentProgress`, `WidgetRenderer` from the UI package
- **Theming**: dark/light toggle via `getTheme()`
- **Suggestions**: pre-filled query buttons (deputy profile, vote result, amendment)

## Architecture

```
boilerplate/
  src/
    routes/
      +page.svelte           -- Main page with chat, widget canvas, agent
      api/chat/+server.ts    -- Server-side Anthropic proxy
    lib/
      widgets/
        register.ts           -- Registration of 3 widgets via createWebMcpServer
        FicheDepute.svelte    -- Deputy profile widget
        ResultatScrutin.svelte -- Vote result widget
        Amendement.svelte     -- Parliamentary amendment widget
```

The app uses the packages:
- `@webmcp-auto-ui/core`: `createWebMcpServer`, `McpMultiClient`
- `@webmcp-auto-ui/agent`: `runAgentLoop`, `RemoteLLMProvider`, `buildSystemPrompt`, `fromMcpTools`, `autoui`
- `@webmcp-auto-ui/sdk`: canvas store for reactive state
- `@webmcp-auto-ui/ui`: `LLMSelector`, `McpStatus`, `AgentProgress`, `WidgetRenderer`, `getTheme`

## Usage

Clone the template:

```bash
npx degit jeanbaptiste/webmcp-auto-ui/apps/boilerplate my-app
cd my-app
npm install
npm run dev
```

Or from the monorepo:

```bash
npm -w apps/boilerplate run dev
```

1. The app automatically connects to the default MCP server on load
2. Type a question in natural language (e.g. "Show me the profile of Jean-Luc Melenchon")
3. The agent generates the corresponding widgets in the grid
4. Use the suggestion buttons to test all 3 widget types
