---
widget: observable-plot-cell
description: Cell (grid-aligned rect). Best for heatmaps with discrete X and Y categories.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    x: { type: array }
    y: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    fill: { type: string, description: "Field name for color or constant color" }
    stroke: { type: string }
    tip: { type: boolean }
---

## When to use
Categorical heatmaps, confusion matrices, calendar heat grids.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-cell", params: { data: [{x:'A',y:'X',v:1},{x:'B',y:'Y',v:2}], fill: 'v' }})
```
