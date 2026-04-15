---
widget: tags
description: Group of tags/badges
group: simple
schema:
  type: object
  required:
    - tags
  properties:
    label:
      type: string
    tags:
      type: array
      items:
        type: object
        required:
          - text
        properties:
          text:
            type: string
          active:
            type: boolean
---

## When to use
Display categories, labels, filters, or badges. Useful for showing tags associated with an item or presenting visual filters.

## How to use
1. Fetch the tags or categories from MCP
2. Call `autoui_webmcp_widget_display('tags', { label: 'Categories', tags: [{ text: 'Finance', active: true }, { text: 'Tech' }] })`
