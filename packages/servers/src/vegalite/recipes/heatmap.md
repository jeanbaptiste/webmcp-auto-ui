---
widget: vegalite-heatmap
description: Heatmap (rect mark) — 2D categorical grid coloured by a numeric value.
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, value}]" }
    scheme: { type: string, description: "Color scheme (viridis, magma, blues, ...)" }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Show intensity across two categorical dimensions (correlation matrix, calendar heatmap, etc).

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-heatmap", params: { title: "Error rate by hour & day", values: [{x:"Mon",y:"09h",value:5},{x:"Mon",y:"14h",value:12},{x:"Tue",y:"09h",value:3},{x:"Tue",y:"14h",value:8},{x:"Wed",y:"09h",value:15},{x:"Wed",y:"14h",value:2}], scheme: "reds", xLabel: "Day", yLabel: "Hour" }})
```
