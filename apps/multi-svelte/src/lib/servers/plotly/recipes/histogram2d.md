---
widget: plotly-histogram2d
description: 2D histogram (bivariate frequency heatmap).
group: plotly
schema:
  type: object
  required: [x, y]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: number }, description: X values }
    y: { type: array, items: { type: number }, description: Y values }
    nbinsx: { type: number, description: Number of X bins }
    nbinsy: { type: number, description: Number of Y bins }
    colorscale: { type: string, description: "Colorscale (default 'Viridis')" }
---

## When to use
Show joint distribution of two variables as a binned heatmap.

## Example
```
widget_display('plotly-histogram2d', { x: [1,2,2,3,3,3], y: [1,1,2,2,3,3] })
```
