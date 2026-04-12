---
widget: plotly-funnelarea
description: Funnel area chart — proportional area per stage.
group: plotly
schema:
  type: object
  required: [values, labels]
  properties:
    title: { type: string, description: Chart title }
    values: { type: array, items: { type: number }, description: Values per stage }
    labels: { type: array, items: { type: string }, description: Stage labels }
    textinfo: { type: string, description: "Text info (default 'percent+label')" }
---

## When to use
Like funnel but with proportional areas (pie-like segments stacked).

## Example
```
plotly_webmcp_widget_display({name: "plotly-funnelarea", params: { values: [5, 4, 3, 2, 1], labels: ['A','B','C','D','E'] }})
```
