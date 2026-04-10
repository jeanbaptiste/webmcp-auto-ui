---
title: Viewer
description: Read-only HyperSkills viewer with CRUD, version DAG, and paste URI
sidebar:
  order: 2
---

Viewer (`apps/viewer2/`) is a read-only HyperSkills reader. It decodes `?hs=` URLs and displays skills with all available UI components.

## Features

- **HyperSkill URL decoding**: automatically loads from `?hs=` in the URL
- **Paste URI**: paste a HyperSkill URL to view it
- **Skills CRUD**: create, read, update, delete skills locally
- **Version DAG**: version tree visualization via `previousHash`
- **Full rendering**: all block types supported via `BlockRenderer`
- **Theming**: respects theme overrides embedded in the skill

## Architecture

```
viewer2/
  src/
    routes/
      +page.svelte    -- Main page with URL decoding and rendering
    lib/
      viewer.ts       -- Decoding logic and version management
```

Packages used:
- `@webmcp-auto-ui/sdk`: `decode`, `getHsParam`, `hash`, skills registry
- `@webmcp-auto-ui/ui`: `BlockRenderer`, `ThemeProvider`

## Usage

```bash
npm -w apps/viewer2 run dev
```

1. Open the app with a `?hs=` parameter in the URL
2. Or paste a HyperSkill URL in the "Paste URI" field
3. The skill is decoded and displayed in read-only mode

## Live demo

[demos.hyperskills.net/viewer2](https://demos.hyperskills.net/viewer2/)
