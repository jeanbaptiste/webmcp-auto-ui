---
widget: gallery
description: Image gallery in grid layout
group: media
schema:
  type: object
  required:
    - images
  properties:
    title:
      type: string
    images:
      type: array
      items:
        type: object
        required:
          - src
        properties:
          src:
            type: string
          alt:
            type: string
          caption:
            type: string
    columns:
      type: number
---

## When to use
Display a collection of images in a grid — photo gallery, image search results, portfolio. Prefer `carousel` for sequential browsing.

## How to use
1. Retrieve image URLs via MCP (never fabricate URLs)
2. Call `autoui_webmcp_widget_display('gallery', { title: 'Site photos', images: [{ src: 'https://...', alt: 'Main view', caption: 'North facade' }], columns: 3 })`

## Common mistakes
- NEVER fabricate image URLs — only use those returned by MCP tools
- STRICTLY FORBIDDEN: placeholder URLs (`via.placeholder.com`, `placehold.co`, `dummyimage.com`, `?text=...`, `example.com/image.jpg`). If no real image is available, do NOT display a gallery — use a `text` or `cards` widget without an image instead
- Always provide an `alt` for accessibility
