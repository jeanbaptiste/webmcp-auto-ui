---
widget: vega-heatmap
description: Heatmap matrix — 2D grid of values colored by intensity.
group: vega
schema:
  type: object
  required: [z]
  properties:
    title: { type: string }
    z: { type: array, description: 2D array of numeric values (rows of columns) }
    xLabels: { type: array, description: Optional column labels }
    yLabels: { type: array, description: Optional row labels }
    scheme: { type: string, description: Vega color scheme (viridis, magma, blues, ...) default viridis }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-heatmap", params: { z: [[1,2,3],[4,5,6],[7,8,9]], xLabels:["A","B","C"], yLabels:["X","Y","Z"] } })
```
