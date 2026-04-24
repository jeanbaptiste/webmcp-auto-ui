---
widget: recharts-area
description: Area chart — filled line series, optionally stacked. Good for cumulative trends.
group: recharts
schema:
  type: object
  required: [rows, areas]
  properties:
    rows: { type: array }
    xKey: { type: string, description: "default 'x'" }
    areas:
      type: array
      description: "[{dataKey:'a', color:'#4f8cff'}]"
    stacked: { type: boolean }
---

## When to use
Visualize magnitude of change over time, or composition over time (stacked).

## Example
```
recharts_webmcp_widget_display({name: "recharts-area", params: {
  rows: [{x:'Jan',a:4,b:2},{x:'Feb',a:6,b:3}],
  areas: [{dataKey:'a'},{dataKey:'b'}],
  stacked: true
}})
```
