---
widget: list
description: Ordered list of items
group: simple
schema:
  type: object
  required:
    - items
  properties:
    title:
      type: string
    items:
      type: array
      items:
        type: string
---

## When to use
Display a simple list of text items — search results, steps, names, inventory items. Prefer `data-table` if items have multiple fields.

## How to use
1. Fetch the data via MCP
2. Extract items as an array of strings
3. Call `autoui_webmcp_widget_display('list', { title: 'Results', items: ['Item 1', 'Item 2', 'Item 3'] })`
