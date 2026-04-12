---
widget: plotly-cone
description: 3D cone (vector field) plot.
group: plotly
schema:
  type: object
  required: [x, y, z, u, v, w]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: number }, description: Cone base X positions }
    y: { type: array, items: { type: number }, description: Cone base Y positions }
    z: { type: array, items: { type: number }, description: Cone base Z positions }
    u: { type: array, items: { type: number }, description: X components of vectors }
    v: { type: array, items: { type: number }, description: Y components of vectors }
    w: { type: array, items: { type: number }, description: Z components of vectors }
    colorscale: { type: string, description: "Colorscale (default 'Blues')" }
    sizemode: { type: string, description: "'absolute' (default) or 'scaled'" }
---

## When to use
Visualize 3D vector fields (flow, magnetic fields, gradients).

## Example
```
widget_display('plotly-cone', { x: [1,2], y: [1,2], z: [1,2], u: [1,0], v: [0,1], w: [0,0] })
```
