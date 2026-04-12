---
widget: plotly-heatmapgl
description: WebGL-accelerated heatmap for large matrices.
group: plotly
schema:
  type: object
  required: [z]
  properties:
    title: { type: string, description: Chart title }
    z: { type: array, items: { type: array, items: { type: number } }, description: 2D array of values }
    x: { type: array, description: Column labels }
    y: { type: array, description: Row labels }
    colorscale: { type: string, description: "Colorscale (default 'Viridis')" }
    showscale: { type: boolean, description: Show color bar (default true) }
---

## When to use
Large matrices (1000x1000+) where SVG heatmap is too slow.

## Example
```
widget_display('plotly-heatmapgl', { z: [[...large matrix...]] })
```
