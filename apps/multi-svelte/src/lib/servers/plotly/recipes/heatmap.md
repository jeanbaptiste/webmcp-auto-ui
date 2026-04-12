---
widget: plotly-heatmap
description: 2D heatmap (matrix visualization). Correlations, confusion matrices, density.
group: plotly
schema:
  type: object
  required: [z]
  properties:
    title: { type: string, description: Chart title }
    z: { type: array, items: { type: array, items: { type: number } }, description: 2D array of values (rows x cols) }
    x: { type: array, description: Column labels }
    y: { type: array, description: Row labels }
    colorscale: { type: string, description: "Colorscale name (default 'Viridis')" }
    showscale: { type: boolean, description: Show color bar (default true) }
    xLabel: { type: string, description: X-axis label }
    yLabel: { type: string, description: Y-axis label }
---

## When to use
Display matrix data, correlation matrices, confusion matrices, or 2D density.

## Example
```
plotly_webmcp_widget_display({name: "plotly-heatmap", params: { z: [[1,2,3],[4,5,6],[7,8,9]], x: ['A','B','C'], y: ['X','Y','Z'] }})
```
