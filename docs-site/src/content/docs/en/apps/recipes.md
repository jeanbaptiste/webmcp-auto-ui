---
title: recipes
description: MCP and WebMCP recipe explorer with live testing
sidebar:
  order: 4
---

The recipes app is an interactive explorer for WebMCP (UI) and MCP (server) recipes. It allows browsing, filtering and testing recipes in real time.

## Features

- **Full catalog**: lists all built-in WebMCP recipes
- **Server filtering**: filter recipes by MCP server name
- **Live testing**: connect an MCP server and test a recipe with real data
- **Preview**: render preview of components associated with each recipe
- **Inspection**: view the YAML frontmatter and markdown body of each recipe

## Architecture

```
recipes/
  src/
    routes/
      +page.svelte        -- Recipe explorer
      api/chat/+server.ts -- Anthropic proxy
    lib/
      explorer.ts         -- Filtering and display logic
```

Packages used:
- `@webmcp-auto-ui/agent`: `WEBMCP_RECIPES`, `filterRecipesByServer`, `parseRecipe`
- `@webmcp-auto-ui/core`: `McpClient` for live tests
- `@webmcp-auto-ui/ui`: `BlockRenderer`, components

## Usage

```bash
npm -w apps/recipes run dev
```

1. Browse recipes in the catalog
2. Click a recipe to see its details (frontmatter, components, conditions)
3. Connect a compatible MCP server
4. Run a live test to see the recipe applied with real data

## Available recipes

| Recipe | Components | When |
|--------|-----------|------|
| KPI Dashboard | stat-card, chart, table, kv | Numeric metrics |
| Art Collection | gallery, cards, carousel | Image collections |
| News Analysis | cards, table, stat-card | Articles |
| Biodiversity | map, stat-card, table | Geographic data |
| Legislative Records | timeline, kv, table | Legislative process |
| Parliamentary Profile | profile, hemicycle, timeline | Deputy profile |
| Legal Texts | list, kv, code | Legal documents |

## Live demo

[demos.hyperskills.net/recipes](https://demos.hyperskills.net/recipes/)
