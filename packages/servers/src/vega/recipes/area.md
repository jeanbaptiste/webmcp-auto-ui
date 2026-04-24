---
widget: vega-area
description: Area chart. Filled line — emphasize magnitude over time.
group: vega
schema:
  type: object
  required: [x, y]
  properties:
    title: { type: string }
    x: { type: array }
    y: { type: array }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
    interpolate: { type: string }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-area", params: { x:[1,2,3,4,5], y:[2,5,3,8,6] } })
```
