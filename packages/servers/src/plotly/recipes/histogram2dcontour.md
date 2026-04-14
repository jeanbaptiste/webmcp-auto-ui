---
widget: plotly-histogram2dcontour
description: 2D histogram with contour lines (kernel density style).
group: plotly
schema:
  type: object
  required: [x, y]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: number }, description: X values }
    y: { type: array, items: { type: number }, description: Y values }
    ncontours: { type: number, description: Number of contour levels }
    colorscale: { type: string, description: "Colorscale (default 'Hot')" }
---

## When to use
Show bivariate density as smooth contour lines.

## Example
```
plotly_webmcp_widget_display({name: "plotly-histogram2dcontour", params: { x: [1,2,2,3,3,3,4], y: [1,1,2,2,3,3,3] }})
```
