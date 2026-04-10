---
title: Showcase
description: Dynamic demo with AI agent, MCP connection and 3 themes
sidebar:
  order: 3
---

Showcase (`apps/showcase2/`) is an interactive showcase of UI components driven by an AI agent. It demonstrates the capabilities of the v0.8 architecture with dynamic theming.

## Features

- **AI agent**: the agent automatically generates component demos
- **MCP connection**: connect to an MCP server to feed components with real data
- **3 themes**: Corporate (blue/white), Nature (green/beige), Neon (purple/black)
- **Interactive catalog**: browse all components with live examples
- **Smart mode**: uses `component()` for discovery and rendering

## Architecture

```
showcase2/
  src/
    routes/
      +page.svelte        -- Main page
      api/chat/+server.ts -- Anthropic proxy
    lib/
      themes.ts           -- 3 theme definitions
```

Packages used:
- `@webmcp-auto-ui/agent`: agent loop, providers
- `@webmcp-auto-ui/core`: `McpClient`
- `@webmcp-auto-ui/ui`: all components, `ThemeProvider`

## Usage

```bash
npm -w apps/showcase2 run dev
```

1. Choose a theme from the 3 available
2. Optional: connect an MCP server
3. Ask the agent to generate component demos
4. Components display with the selected theme

## Live demo

[demos.hyperskills.net/showcase2](https://demos.hyperskills.net/showcase2/)
