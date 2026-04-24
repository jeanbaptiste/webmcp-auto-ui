---
widget: vega-line
description: Line chart. Time series or ordered sequences.
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
    interpolate: { type: string, description: "linear, monotone, step, step-before, step-after, basis, cardinal" }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-line", params: { x:[1,2,3,4,5], y:[2,5,3,8,6], title:"Trend" } })
```
