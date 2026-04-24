---
widget: vega-scatter
description: Scatter plot. Optional size and category encoding.
group: vega
schema:
  type: object
  required: [x, y]
  properties:
    title: { type: string }
    x: { type: array }
    y: { type: array }
    size: { type: array, description: Optional per-point size values }
    category: { type: array, description: Optional per-point category for color }
    color: { type: string, description: Single color (used if category absent) }
    xLabel: { type: string }
    yLabel: { type: string }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-scatter", params: { x:[1,2,3,4], y:[4,5,2,8], category:["a","b","a","b"] } })
```
