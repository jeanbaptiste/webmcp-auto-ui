---
widget: agcharts-donut
description: Donut chart. Pie with hole — same usage but more legible labels.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    angleKey: { type: string }
    labelKey: { type: string }
    innerRadiusRatio: { type: number, description: "0..1 (default 0.6)" }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-donut", params: { data:[{x:'A',y:30},{x:'B',y:70}], title:'Share' }})
```
