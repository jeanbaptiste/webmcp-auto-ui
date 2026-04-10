---
title: Todo
description: WebMCP todo app with the new layers architecture, minimal template
sidebar:
  order: 5
---

Todo (`apps/todo2/`) is a minimal todo app that serves as a template for starting a project with the v0.8 architecture. It demonstrates MCP CRUD integration in a simple context.

## Features

- **Layers architecture**: uses `ToolLayer[]` to structure tools
- **MCP CRUD**: create, read, update, delete todos via an MCP server
- **LLM agent**: natural language interaction for managing todos
- **Minimal template**: intentionally simple code to serve as a starting point

## Architecture

```
todo2/
  src/
    routes/
      +page.svelte        -- Main page
      api/chat/+server.ts -- Anthropic proxy
    lib/
      agent.ts            -- Layer construction
```

Packages used:
- `@webmcp-auto-ui/agent`: `runAgentLoop`, providers
- `@webmcp-auto-ui/core`: `McpClient`
- `@webmcp-auto-ui/sdk`: canvas store
- `@webmcp-auto-ui/ui`: `BlockRenderer`, base components

## Usage

```bash
npm -w apps/todo2 run dev
```

1. Connect an MCP server that exposes CRUD tools (create, read, update, delete)
2. Ask the agent "Add a task: deploy v0.7"
3. The agent calls the MCP server to create the task and displays the result

## As a template

todo2 is designed to be copied and adapted:

```bash
cp -r apps/todo2 apps/my-app
```

Modify:
1. `package.json`: change the workspace name
2. `+page.svelte`: adapt the UI
3. `agent.ts`: configure layers for your use case

## Live demo

[demos.hyperskills.net/todo2](https://demos.hyperskills.net/todo2/)
