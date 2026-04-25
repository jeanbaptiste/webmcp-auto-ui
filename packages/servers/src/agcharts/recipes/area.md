---
widget: agcharts-area
description: Area chart. Emphasize cumulative magnitude over an ordinal axis.
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
    stacked: { type: boolean }
    fillOpacity: { type: number }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-area", params: { data:[{x:'Jan',y:30},{x:'Feb',y:60}], title:'Volume' }})
```
