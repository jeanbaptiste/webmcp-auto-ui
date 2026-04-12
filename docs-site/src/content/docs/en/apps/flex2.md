---
title: Flex
description: AI canvas with ToolLayers, 3 UI tools (list_components, get_component, component), LogDrawer, RecipeModal and composer/consumer mode
sidebar:
  order: 1
---

Flex (`apps/flex2/`) is the main demo app for the v0.8 architecture. It combines an interactive canvas, an LLM agent, and multi-MCP connection in a unified interface.

## Features

- **ToolLayers**: automatic `McpLayer` and `WebMcpLayer` construction on MCP connection
- **Single component()**: smart mode by default, one UI tool for the LLM
- **Debug panel**: real-time visualization of the generated prompt, tool calls, and metrics
- **Provenance badges**: each block displays its origin (which tool, which server)
- **Composer/consumer mode**: toggle between editing and read-only
- **RecipeModal**: modal panel listing available WebMCP and MCP recipes
- **LogDrawer**: side drawer using `AgentConsole` from the UI package to display real-time agent logs
- **HyperSkill export**: gzip export via SDK encode
- **SettingsPanel**: displays the effective prompt (effectivePrompt) in readonly
- **Multi-MCP**: simultaneous connection to multiple servers

## Architecture

```
flex2/
  src/
    routes/
      +page.svelte        -- Main page with canvas, chat, and panels
      api/chat/+server.ts -- Server-side Anthropic proxy
    lib/
      agent.ts            -- Layer construction and loop launch
      panels/             -- Debug panel, recipes panel, logs panel
```

The app directly uses the packages:
- `@webmcp-auto-ui/agent`: `runAgentLoop`, `buildToolsFromLayers`, `buildSystemPrompt`, recipes
- `@webmcp-auto-ui/core`: `McpClient` for MCP connection
- `@webmcp-auto-ui/sdk`: canvas store for reactive state
- `@webmcp-auto-ui/ui`: `BlockRenderer`, `ThemeProvider`, agent UI components

## Usage

```bash
npm -w apps/flex2 run dev
```

1. Select an LLM provider (Claude, Gemma, Ollama)
2. Connect one or more MCP servers
3. Ask a question in natural language in the chat
4. The agent automatically generates a dashboard with appropriate components
5. Export as a HyperSkill URL to share

## Live demo

[demos.hyperskills.net/flex2](https://demos.hyperskills.net/flex2/)
