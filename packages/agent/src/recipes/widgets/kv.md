---
widget: kv
description: Key-value pairs (properties, metadata)
group: simple
schema:
  type: object
  required:
    - rows
  properties:
    title:
      type: string
    rows:
      type: array
      items:
        type: array
        items:
          type: string
        minItems: 2
        maxItems: 2
---

## When to use
Display properties or metadata as key-value pairs. Ideal for detail cards, configurations, and structured summaries.

## How to use
1. Fetch the data via MCP (e.g. record details, object properties)
2. Format as an array of pairs: `[['Name', 'Alice'], ['Email', 'alice@example.com']]`
3. Call `autoui_webmcp_widget_display('kv', { title: 'User details', rows: [['Name', 'Alice'], ['Email', 'alice@example.com']] })`

## Common mistakes
- Passing an object `{key: value}` instead of an array of pairs `[[key, value]]`
