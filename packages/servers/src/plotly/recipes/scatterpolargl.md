---
widget: plotly-scatterpolargl
description: WebGL-accelerated polar scatter for large datasets.
group: plotly
schema:
  type: object
  required: [r, theta]
  properties:
    title: { type: string, description: Chart title }
    r: { type: array, items: { type: number }, description: Radial values }
    theta: { type: array, items: { type: number }, description: Angular values in degrees }
    mode: { type: string, description: "'markers' (default)" }
    markerSize: { type: number, description: Marker size (default 4) }
    color: { type: array, description: Marker colors }
---

## When to use
Large polar scatter datasets where SVG is too slow.

## Example
```
plotly_webmcp_widget_display({name: "plotly-scatterpolargl", params: { r: [1,2,3,4,5], theta: [0, 72, 144, 216, 288] }})
```
