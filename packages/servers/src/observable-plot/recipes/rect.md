---
widget: observable-plot-rect
description: Rectangle mark. Each datum yields a rectangle between (x1,y1) and (x2,y2). Useful for 2D histograms, heatmaps, time ranges.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Array of objects with x1,y1,x2,y2" }
    x1: { type: string, description: "Field name for x1" }
    x2: { type: string }
    y1: { type: string }
    y2: { type: string }
    fill: { type: string }
    stroke: { type: string }
    fillOpacity: { type: number }
    interval: { type: [string, number] }
    tip: { type: boolean }
---

## When to use
2D binning, ranges, calendar cells.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-rect", params: { data: [{x1:0,y1:0,x2:1,y2:1,v:0.5}], fill: 'v' }})
```
