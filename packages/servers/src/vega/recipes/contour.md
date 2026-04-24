---
widget: vega-contour
description: 2D density contour plot from scatter points (KDE).
group: vega
schema:
  type: object
  required: [x, y]
  properties:
    title: { type: string }
    x: { type: array, description: Array of numeric x values }
    y: { type: array, description: Array of numeric y values (same length as x) }
    bandwidth: { type: number, description: KDE bandwidth in pixels (default 20) }
    xLabel: { type: string }
    yLabel: { type: string }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-contour", params: { x:[1,2,2,3,3,3,4,4,5], y:[1,2,3,2,3,4,3,4,5] } })
```
