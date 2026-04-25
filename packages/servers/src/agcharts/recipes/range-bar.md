---
widget: agcharts-range-bar
description: Range bar — show min/max interval per category (gantt-like).
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Rows like {x, low, high}" }
    xKey: { type: string }
    yLowKey: { type: string }
    yHighKey: { type: string }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-range-bar", params: { data:[{x:'A',low:10,high:30},{x:'B',low:5,high:18}] }})
```
