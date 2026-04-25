---
widget: vegalite-trail
description: Line whose stroke width varies with a `size` field (Vega-Lite trail mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, size, series?}]" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Time series where magnitude of a secondary variable modulates line thickness.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-trail", params: { title: "Wind speed over time", values: [{x:1,y:20,size:5},{x:2,y:22,size:8},{x:3,y:18,size:3},{x:4,y:25,size:12},{x:5,y:30,size:15},{x:6,y:27,size:10}], xLabel: "Hour", yLabel: "Direction" }})
```
