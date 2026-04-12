---
title: Home
description: Static landing page with links to all webmcp-auto-ui demos and list of available MCP servers
sidebar:
  order: 6
---

Home (`apps/home/`) is the project's static landing page. It lists all available demos with their descriptions and provides an overview of connectable MCP servers.

## Features

- **Demo catalog**: list of all apps (Flex, Viewer, Showcase, Todo, Recipes, Multi-Svelte, Boilerplate) with description and direct link
- **MCP servers**: grid of available servers (Tricoteuses, Hacker News, Met Museum, Open-Meteo, Wikipedia, iNaturalist, data.gouv.fr, NASA)
- **Theming**: dark/light toggle via `getTheme()` from the UI package
- **Static build**: deployed as static files via `@sveltejs/adapter-static`

## Architecture

```
home/
  src/
    routes/
      +page.svelte    -- Single page with demo catalog and MCP servers
```

The app uses the packages:
- `@webmcp-auto-ui/ui`: `getTheme` for dark/light theming

## Usage

```bash
npm -w apps/home run dev
```

For the production build:

```bash
PUBLIC_BASE_URL=https://demos.hyperskills.net npm -w apps/home run build
```

The `PUBLIC_BASE_URL` variable is required in production so that demo links point to the correct paths.

## Live demo

[demos.hyperskills.net](https://demos.hyperskills.net)
