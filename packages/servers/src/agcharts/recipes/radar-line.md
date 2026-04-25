---
widget: agcharts-radar-line
description: Radar line — multivariate values on a polar axis with line.
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
agcharts_webmcp_widget_display({name: "agcharts-radar-line", params: { data:[{x:'Speed',y:80},{x:'Power',y:60},{x:'Range',y:90}] }})
```
