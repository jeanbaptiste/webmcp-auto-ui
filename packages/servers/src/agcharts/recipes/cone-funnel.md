---
widget: agcharts-cone-funnel
description: Cone funnel — pyramidal variant of funnel chart.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    stageKey: { type: string }
    valueKey: { type: string }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-cone-funnel", params: { data:[{x:'A',y:1000},{x:'B',y:300}] }})
```
