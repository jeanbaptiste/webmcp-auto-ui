---
widget: plotly-streamtube
description: 3D streamtube plot for fluid flow visualization.
group: plotly
schema:
  type: object
  required: [x, y, z, u, v, w]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: number }, description: Grid X positions }
    y: { type: array, items: { type: number }, description: Grid Y positions }
    z: { type: array, items: { type: number }, description: Grid Z positions }
    u: { type: array, items: { type: number }, description: X velocity components }
    v: { type: array, items: { type: number }, description: Y velocity components }
    w: { type: array, items: { type: number }, description: Z velocity components }
    colorscale: { type: string, description: "Colorscale (default 'Portland')" }
    maxdisplayed: { type: number, description: Max tubes displayed (default 3000) }
---

## When to use
Visualize 3D fluid flow or wind patterns as tubes following streamlines.

## Example
```
widget_display('plotly-streamtube', { x: [0,0,0,1,1,1], y: [0,1,2,0,1,2], z: [0,0,0,0,0,0], u: [1,1,1,1,1,1], v: [0,0.1,-0.1,0,0.1,-0.1], w: [0,0,0,0,0,0] })
```
