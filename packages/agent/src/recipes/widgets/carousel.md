---
widget: carousel
description: Slide carousel (images or content)
group: media
schema:
  type: object
  required:
    - slides
  properties:
    title:
      type: string
    slides:
      type: array
      items:
        type: object
        properties:
          src:
            type: string
          title:
            type: string
          subtitle:
            type: string
          content:
            type: string
    autoPlay:
      type: boolean
    interval:
      type: number
---

## When to use
For sequential content browsing — presentations, step-by-step tutorials, narrative galleries. Prefer `gallery` for an overview in grid layout.

## How to use
1. Retrieve or compose the slides
2. Call `autoui_webmcp_widget_display('carousel', { title: 'Presentation', slides: [{ title: 'Step 1', content: 'Project introduction...' }, { title: 'Step 2', src: 'https://...', subtitle: 'Architecture' }], autoPlay: false })`

## Common mistakes
- Never fabricate image URLs for `src` — only use URLs returned by MCP tools
