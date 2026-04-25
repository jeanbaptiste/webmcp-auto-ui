---
widget: vegalite-loess
description: Scatter + LOESS smoother (Vega-Lite loess transform).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y}]" }
    bandwidth: { type: number, description: "0..1 (default 0.3)" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Non-parametric smoothing — detect non-linear patterns without fitting a formula.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-loess", params: { title: "Clicks vs Conversion", values: [{x:10,y:2.1},{x:20,y:3.5},{x:30,y:5.8},{x:40,y:7.2},{x:50,y:6.9},{x:60,y:8.4},{x:70,y:9.1},{x:80,y:8.7}], bandwidth: 0.4, xLabel: "Clicks", yLabel: "Conversion %" }})
```
