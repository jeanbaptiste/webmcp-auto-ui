---
widget: perspective-y-bar
description: Y Bar (vertical bars). Explicit vertical-bar variant.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array }
    group_by: { type: array }
    split_by: { type: array }
    columns: { type: array }
    aggregates: { type: object }
---

## When to use
Vertical bars. Identical to perspective-bar.

## Example
```
perspective_webmcp_widget_display({name: "perspective-y-bar", params: { rows: [...], group_by: ['quarter'], columns: ['revenue'] }})
```
