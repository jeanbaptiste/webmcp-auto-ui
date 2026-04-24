---
widget: nivo-scatterplot
description: Scatter plot with multiple series and optional mesh-based hover.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data: { type: array, description: "Series [{ id, data: [{x, y}, ...] }, ...]" }
    nodeSize: { type: number, description: Dot size in px (default 9) }
    axisBottomLegend: { type: string }
    axisLeftLegend: { type: string }
---

## When to use
Visualize correlations between two continuous variables.

## Example
```
nivo_webmcp_widget_display({name: "nivo-scatterplot", params: { data: [{id:'A', data:[{x:1,y:2},{x:3,y:5}]}] }})
```
