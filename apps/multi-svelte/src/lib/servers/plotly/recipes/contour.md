---
widget: plotly-contour
description: Contour plot (2D density lines). Topographic or density visualization.
group: plotly
schema:
  type: object
  required: [z]
  properties:
    title: { type: string, description: Chart title }
    z: { type: array, items: { type: array, items: { type: number } }, description: 2D values grid }
    x: { type: array, items: { type: number }, description: X coordinates }
    y: { type: array, items: { type: number }, description: Y coordinates }
    colorscale: { type: string, description: "Colorscale (default 'Viridis')" }
    ncontours: { type: number, description: Number of contour levels }
    showlabels: { type: boolean, description: Show contour labels (default true) }
---

## When to use
Show iso-lines of a 2D function or density estimation.

## Example
```
widget_display('plotly-contour', { z: [[1,2,3],[4,5,6],[7,8,9]], colorscale: 'Hot' })
```
