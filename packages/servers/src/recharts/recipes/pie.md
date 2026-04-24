---
widget: recharts-pie
description: Pie or donut chart — proportional share of a whole across a handful of categories.
group: recharts
schema:
  type: object
  required: [rows]
  properties:
    rows: { type: array, description: "[{name:'A', value:30}]" }
    nameKey: { type: string, description: "default 'name'" }
    valueKey: { type: string, description: "default 'value'" }
    donut: { type: boolean, description: "Inner hole (default false)" }
    label: { type: boolean }
---

## When to use
Small number of parts (≤ 6) summing to a meaningful whole.

## Example
```
recharts_webmcp_widget_display({name: "recharts-pie", params: {
  rows: [{name:'A',value:30},{name:'B',value:50},{name:'C',value:20}],
  donut: true
}})
```
