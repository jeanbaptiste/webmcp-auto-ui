---
widget: agcharts-line
description: Line chart. Show a trend over a continuous or ordinal axis.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    x: { type: array }
    y: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    xName: { type: string }
    yName: { type: string }
    smooth: { type: boolean, description: "Use smooth interpolation" }
    marker: { type: boolean, description: "Show point markers (default true)" }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-line", params: { data:[{x:1,y:3},{x:2,y:5},{x:3,y:4}], title:'Signal' }})
```
