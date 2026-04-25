---
widget: agcharts-heatmap
description: Heatmap — value intensity across a 2D categorical grid.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Rows like {x, y, value}" }
    xKey: { type: string }
    yKey: { type: string }
    colorKey: { type: string }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-heatmap", params: { data:[{x:'A',y:'P',value:1},{x:'B',y:'P',value:5}] }})
```
