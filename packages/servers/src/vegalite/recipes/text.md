---
widget: vegalite-text
description: Text labels at (x, y) positions (Vega-Lite text mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, text}]" }
    color: { type: string }
    fontSize: { type: number }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Annotate a plot with labels at specific coordinates.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-text", params: { title: "City labels", values: [{x:2.3,y:48.9,text:"Paris"},{x:13.4,y:52.5,text:"Berlin"},{x:-0.1,y:51.5,text:"London"},{x:12.5,y:41.9,text:"Rome"}], xLabel: "Longitude", yLabel: "Latitude" }})
```
