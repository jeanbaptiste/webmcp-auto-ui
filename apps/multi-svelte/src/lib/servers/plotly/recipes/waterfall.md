---
widget: plotly-waterfall
description: Waterfall chart — cumulative effect of sequential values.
group: plotly
schema:
  type: object
  required: [x, y, measure]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: string }, description: Category labels }
    y: { type: array, items: { type: number }, description: Values }
    measure: { type: array, items: { type: string }, description: "'relative', 'total', or 'absolute' per bar" }
    connector: { type: object, description: Connector line style }
---

## When to use
Show how individual values contribute to a running total (P&L, budgets).

## Example
```
plotly_webmcp_widget_display({name: "plotly-waterfall", params: { x: ['Revenue','Costs','Tax','Profit'], y: [100,-30,-10,0], measure: ['relative','relative','relative','total'] }})
```
