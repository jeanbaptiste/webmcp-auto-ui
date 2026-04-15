---
widget: cards
description: Card grid with title, description, and tags
group: rich
schema:
  type: object
  required:
    - cards
  properties:
    title:
      type: string
    cards:
      type: array
      items:
        type: object
        required:
          - title
        properties:
          title:
            type: string
          description:
            type: string
          subtitle:
            type: string
          tags:
            type: array
            items:
              type: string
---

## When to use
Display a collection of rich items — products, articles, projects, events. Each card combines a title, description, and tags. Prefer `list` for simple items without structure.

## How to use
1. Retrieve the collection via MCP
2. Call `autoui_webmcp_widget_display('cards', { title: 'Active projects', cards: [{ title: 'UI Redesign', description: 'Migration to Svelte 5', subtitle: 'Q2 2024', tags: ['frontend', 'high priority'] }] })`

## Common mistakes
- NEVER fabricate image URLs for the `image` field. Use ONLY the URLs returned by MCP tools. If no URL is available, do not include an image field — the widget renders correctly without it.
- STRICTLY FORBIDDEN: placeholder URLs (`via.placeholder.com`, `placehold.co`, `dummyimage.com`, `?text=...`). Omit the `image` field rather than using a placeholder.
- Always provide a `title` for each card
