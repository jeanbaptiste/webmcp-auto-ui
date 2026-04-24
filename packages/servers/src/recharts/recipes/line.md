---
widget: recharts-line
description: Line chart — one or more series over a shared X axis. Good for trends over time.
group: recharts
schema:
  type: object
  required: [rows, lines]
  properties:
    rows: { type: array, description: "Array of row objects, e.g. [{x: 'Jan', a: 10, b: 20}]" }
    xKey: { type: string, description: "Row key for the X axis (default 'x')" }
    lines:
      type: array
      description: "One entry per series: [{dataKey: 'a', color: '#4f8cff'}]"
    title: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Temporal trends or any continuous X with one or more numeric series.

## Example
```
recharts_webmcp_widget_display({name: "recharts-line", params: {
  rows: [{x:'Jan', a:10, b:5},{x:'Feb', a:20, b:12},{x:'Mar', a:15, b:18}],
  xKey: 'x',
  lines: [{dataKey:'a'},{dataKey:'b'}]
}})
```
