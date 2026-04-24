---
widget: recharts-bar
description: Bar chart — grouped or stacked, vertical (default) or horizontal layout.
group: recharts
schema:
  type: object
  required: [rows, bars]
  properties:
    rows: { type: array, description: "Row objects, e.g. [{x:'A', v1:10, v2:20}]" }
    xKey: { type: string, description: "Category key (default 'x')" }
    bars:
      type: array
      description: "One entry per bar series: [{dataKey:'v1', color:'#4f8cff'}]"
    stacked: { type: boolean, description: "Stack bars (default false)" }
    layout: { type: string, description: "'horizontal' (default) or 'vertical' (for horizontal bars)" }
    title: { type: string }
---

## When to use
Compare values across discrete categories. Use `layout: 'vertical'` for long category labels.

## Example
```
recharts_webmcp_widget_display({name: "recharts-bar", params: {
  rows: [{x:'Q1', sales:120, cost:80},{x:'Q2', sales:150, cost:90}],
  bars: [{dataKey:'sales'},{dataKey:'cost'}],
  stacked: false
}})
```
