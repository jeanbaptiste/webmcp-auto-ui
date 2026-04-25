---
widget: agcharts-range-area
description: Range area — band between low/high values across an ordinal axis.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    xKey: { type: string }
    yLowKey: { type: string }
    yHighKey: { type: string }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-range-area", params: { data:[{x:1,low:10,high:30},{x:2,low:14,high:28}] }})
```
