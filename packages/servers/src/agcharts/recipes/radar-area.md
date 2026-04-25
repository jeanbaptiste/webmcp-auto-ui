---
widget: agcharts-radar-area
description: Radar area — multivariate filled polygon on a polar axis.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    angleKey: { type: string }
    radiusKey: { type: string }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-radar-area", params: { data:[{x:'Speed',y:80},{x:'Power',y:60},{x:'Range',y:90}] }})
```
