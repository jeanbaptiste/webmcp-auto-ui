---
widget: plotly-scattercarpet
description: Scatter points plotted on a carpet coordinate system.
group: plotly
schema:
  type: object
  required: [a, b, carpetData]
  properties:
    title: { type: string, description: Chart title }
    a: { type: array, items: { type: number }, description: A-axis values of scatter points }
    b: { type: array, items: { type: number }, description: B-axis values of scatter points }
    carpet: { type: string, description: "Carpet ID to plot on (default 'carpet1')" }
    mode: { type: string, description: "'markers' (default)" }
    markerSize: { type: number, description: Marker size (default 8) }
    carpetData:
      type: object
      required: [a, b, x, y]
      properties:
        a: { type: array, items: { type: number } }
        b: { type: array, items: { type: number } }
        x: { type: array }
        y: { type: array }
      description: The underlying carpet grid data
---

## When to use
Plot data points in a parametric carpet coordinate system.

## Example
```
plotly_webmcp_widget_display({name: "plotly-scattercarpet", params: { a: [1.5, 2.5], b: [1.5, 2.5], carpetData: { a: [1,2,3], b: [1,2,3], x: [[1,2,3],[1.5,2.5,3.5],[2,3,4]], y: [[1,1,1],[2,2,2],[3,3,3]] } }})
```
