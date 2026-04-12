---
widget: plotly-scatter3d
description: 3D scatter plot with interactive rotation.
group: plotly
schema:
  type: object
  required: [x, y, z]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: number }, description: X coordinates }
    y: { type: array, items: { type: number }, description: Y coordinates }
    z: { type: array, items: { type: number }, description: Z coordinates }
    mode: { type: string, description: "'markers' (default), 'lines', 'lines+markers'" }
    markerSize: { type: number, description: Marker size (default 4) }
    color: { type: array, items: { type: number }, description: Color values }
---

## When to use
Visualize 3D point clouds, trajectories, or clustered data in 3 dimensions.

## Example
```
widget_display('plotly-scatter3d', { x: [1,2,3], y: [4,5,6], z: [7,8,9], mode: 'markers' })
```
