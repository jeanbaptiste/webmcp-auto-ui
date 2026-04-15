---
widget: text
description: Free-form text paragraph
group: simple
schema:
  type: object
  required:
    - content
  properties:
    content:
      type: string
---

## When to use
Display an explanatory paragraph, a summary, or a long description. Prefer `stat` for a single figure, `kv` for structured pairs.

## How to use
1. Write or fetch the text to display
2. Call `autoui_webmcp_widget_display('text', { content: 'Here is the summary of the analysis...' })`
