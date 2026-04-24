---
widget: vegalite-line
description: Line chart (Vega-Lite). Trends over a continuous or temporal x axis, optionally multi-series.
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, series?}]" }
    x: { type: array }
    y: { type: array }
    series: { type: array }
    point: { type: boolean, description: "Show point markers on the line" }
    interpolate: { type: string, description: "linear | monotone | step | basis" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Trend analysis over time or ordered x. ISO date strings are auto-detected as temporal.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-line", params: { x: [1,2,3,4], y: [3,7,2,8] }})
```
