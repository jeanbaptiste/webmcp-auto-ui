---
widget: agcharts-column
description: Vertical bar (column) chart. Compare values across a small set of categories.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Rows e.g. [{x:'A', y:10}, ...]" }
    x: { type: array }
    y: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    xName: { type: string }
    yName: { type: string }
    stacked: { type: boolean }
---

## When to use
Compare values across categories with vertical columns.

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-column", params: { data: [{x:'Q1', y:120},{x:'Q2', y:160}], title:'Revenue' }})
```
