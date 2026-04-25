---
widget: vegalite-area
description: Area chart (Vega-Lite). Filled curves, optionally stacked by series.
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array }
    x: { type: array }
    y: { type: array }
    series: { type: array }
    stack: { type: string, description: "'zero', 'normalize', 'center', null" }
    interpolate: { type: string }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Show magnitude over time, or part-to-whole breakdowns (`stack: 'normalize'` for 100%).

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-area", params: { title: "Monthly revenue", values: [{x:"Jan",y:120},{x:"Feb",y:145},{x:"Mar",y:98},{x:"Apr",y:172},{x:"May",y:160}], xLabel: "Month", yLabel: "Revenue (k$)" }})
```
