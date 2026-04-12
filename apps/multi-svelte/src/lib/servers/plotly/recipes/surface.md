---
widget: plotly-surface
description: 3D surface plot — visualize z = f(x, y) as a mesh.
group: plotly
schema:
  type: object
  required: [z]
  properties:
    title: { type: string, description: Chart title }
    z: { type: array, items: { type: array, items: { type: number } }, description: 2D array of Z values }
    x: { type: array, items: { type: number }, description: X coordinates }
    y: { type: array, items: { type: number }, description: Y coordinates }
    colorscale: { type: string, description: "Colorscale (default 'Viridis')" }
    showscale: { type: boolean, description: Show color bar (default true) }
---

## When to use
Visualize mathematical surfaces, terrain, or any z = f(x,y) function.

## Example
```
widget_display('plotly-surface', { z: [[1,2,3],[4,5,6],[7,8,9]] })
```
