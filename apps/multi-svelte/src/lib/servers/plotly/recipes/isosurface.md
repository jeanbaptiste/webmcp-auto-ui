---
widget: plotly-isosurface
description: 3D isosurface — surfaces of constant value in a scalar field.
group: plotly
schema:
  type: object
  required: [x, y, z, value]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: number }, description: X grid coordinates }
    y: { type: array, items: { type: number }, description: Y grid coordinates }
    z: { type: array, items: { type: number }, description: Z grid coordinates }
    value: { type: array, items: { type: number }, description: Scalar field values }
    isomin: { type: number, description: Minimum iso value }
    isomax: { type: number, description: Maximum iso value }
    colorscale: { type: string, description: "Colorscale (default 'BlueRed')" }
    opacity: { type: number, description: Opacity 0-1 (default 0.6) }
    caps: { type: object, description: "Cap visibility { x: {show}, y: {show}, z: {show} }" }
---

## When to use
Extract and render surfaces at specific threshold values in volumetric data.

## Example
```
plotly_webmcp_widget_display({name: "plotly-isosurface", params: { x: [0,0,0,0,1,1,1,1], y: [0,0,1,1,0,0,1,1], z: [0,1,0,1,0,1,0,1], value: [1,2,3,4,5,6,7,8], isomin: 3, isomax: 6 }})
```
