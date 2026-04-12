---
widget: plotly-volume
description: 3D volume rendering — semi-transparent isosurfaces.
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
    isomin: { type: number, description: Minimum isosurface value }
    isomax: { type: number, description: Maximum isosurface value }
    opacity: { type: number, description: Surface opacity (default 0.1) }
    surface: { type: boolean, description: Show bounding surface (default true) }
    colorscale: { type: string, description: "Colorscale (default 'RdBu')" }
---

## When to use
Visualize 3D scalar fields (medical imaging, simulations, weather data).

## Example
```
plotly_webmcp_widget_display({name: "plotly-volume", params: { x: [0,0,0,0,1,1,1,1], y: [0,0,1,1,0,0,1,1], z: [0,1,0,1,0,1,0,1], value: [1,2,3,4,5,6,7,8], isomin: 2, isomax: 7 }})
```
