---
widget: vegalite-circle
description: Scatter with filled circles (Vega-Lite circle mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array }
    x: { type: array }
    y: { type: array }
    series: { type: array }
    size: { type: number }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Scatter with slightly softer visual than `point`. Same data shape.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-circle", params: { title: "Height vs Weight", values: [{x:160,y:55},{x:170,y:68},{x:175,y:72},{x:180,y:80},{x:165,y:60},{x:185,y:90}], xLabel: "Height (cm)", yLabel: "Weight (kg)" }})
```
