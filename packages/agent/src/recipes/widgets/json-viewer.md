---
widget: json-viewer
description: Interactive JSON viewer with expand/collapse
group: rich
schema:
  type: object
  required:
    - data
  properties:
    title:
      type: string
    data: {}
    maxDepth:
      type: number
    expanded:
      type: boolean
---

## When to use
Display raw JSON data interactively — API responses, configurations, complex data structures. The user can explore the tree by expanding levels.

## How to use
1. Fetch JSON data via MCP
2. Call `autoui_webmcp_widget_display('json-viewer', { title: 'API Response', data: { users: [...] }, maxDepth: 3, expanded: false })`

## Common mistakes
- Passing a JSON string instead of an object — `data` expects an object/array, not a string
