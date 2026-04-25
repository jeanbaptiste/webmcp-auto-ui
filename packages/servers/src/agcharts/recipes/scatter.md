---
widget: agcharts-scatter
description: Scatter plot. Reveal correlation between two numeric variables.
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
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-scatter", params: { data:[{x:1,y:2},{x:3,y:5},{x:5,y:4}], title:'Correlation' }})
```
