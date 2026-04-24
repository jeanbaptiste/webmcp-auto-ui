---
widget: observable-plot-dot
description: Scatter plot (dot mark). Shows individual observations in 2D, optionally colored or sized by additional dimensions.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string, description: Chart title }
    data: { type: array, description: "Array of objects. Example: [{x:1,y:2}, ...]" }
    x: { type: array, description: "X values (alternative to data, parallel arrays)" }
    y: { type: array, description: "Y values" }
    xKey: { type: string, description: "Field name for x (default 'x')" }
    yKey: { type: string, description: "Field name for y (default 'y')" }
    fill: { type: string, description: "Fill color or field name" }
    stroke: { type: string, description: "Stroke color or field name" }
    r: { type: [number, string], description: "Radius or field name" }
    symbol: { type: string, description: "Symbol: circle, square, triangle, diamond, star, cross, plus" }
    tip: { type: boolean, description: "Enable tooltip on hover" }
    xLabel: { type: string }
    yLabel: { type: string }
    grid: { type: boolean }
---

## When to use
Scatter plots to explore relationships between two continuous variables, detect clusters, outliers.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-dot", params: { data: [{x:1,y:2},{x:3,y:4}], title: 'Scatter', tip: true }})
```
