---
widget: vegalite-regression
description: Scatter + regression fit line (linear / poly / log / exp / pow / quad).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y}]" }
    method: { type: string, description: "linear (default) | log | exp | pow | quad | poly" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Explore a two-variable relationship with a fitted trend.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-regression", params: { title: "Ad spend vs Revenue", values: [{x:1,y:4.2},{x:2,y:6.8},{x:3,y:9.1},{x:4,y:11.5},{x:5,y:14.3},{x:6,y:16.8},{x:7,y:18.2}], method: "linear", xLabel: "Ad spend (k$)", yLabel: "Revenue (k$)" }})
```
