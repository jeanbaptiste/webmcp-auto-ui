---
widget: nivo-waffle
description: Waffle chart — grid of cells showing proportions.
group: nivo
schema:
  type: object
  required: [data, total]
  properties:
    data: { type: array, description: "[{id, label, value}, ...]" }
    total: { type: number, description: Total value represented by the full grid }
    rows: { type: number, description: Grid rows (default 10) }
    columns: { type: number, description: Grid columns (default 14) }
---

## When to use
Make proportions easy to count; good alternative to small pies.

## Example
```
nivo_webmcp_widget_display({name: "nivo-waffle", params: { data: [{id:'A', label:'A', value:30},{id:'B', label:'B', value:70}], total: 100 }})
```
