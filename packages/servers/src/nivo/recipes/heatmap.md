---
widget: nivo-heatmap
description: 2D heatmap — matrix of values with sequential colors.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data: { type: array, description: "Rows [{ id, data: [{x, y: number}, ...] }, ...]" }
    axisTopLegend: { type: string }
    axisLeftLegend: { type: string }
---

## When to use
Show intensity of a numerical value across two categorical axes.

## Example
```
nivo_webmcp_widget_display({name: "nivo-heatmap", params: { data: [{id:'Row1', data:[{x:'A', y:10},{x:'B', y:20}]}] }})
```
