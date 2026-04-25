---
widget: s2-cell-id
description: Render a single S2 cell from an arbitrary cellId (token, "face/path" string, or decimal).
group: s2
schema:
  type: object
  required: [cellId]
  properties:
    cellId: { type: string, description: "S2 cell token (hex), 'face/path' (e.g. '4/120'), or decimal" }
    style: { type: string }
---

## When to use
Inspect a known S2 cell by its identifier (e.g. from a database).

## Example
```
s2_webmcp_widget_display({name: "s2-cell-id", params: { cellId: "4/120" }})
```
