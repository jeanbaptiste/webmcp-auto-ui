---
widget: recharts-composed
description: Composed chart — mix bars, lines, areas and scatter points on the same axes.
group: recharts
schema:
  type: object
  required: [rows, series]
  properties:
    rows: { type: array }
    xKey: { type: string }
    series:
      type: array
      description: "[{type:'bar'|'line'|'area'|'scatter', dataKey, color?}]"
---

## When to use
Show related metrics of different nature (e.g. revenue bars + margin line).

## Example
```
recharts_webmcp_widget_display({name: "recharts-composed", params: {
  rows: [{x:'Q1',rev:100,margin:0.2},{x:'Q2',rev:140,margin:0.25}],
  series: [{type:'bar',dataKey:'rev'},{type:'line',dataKey:'margin'}]
}})
```
