---
widget: agcharts-nightingale
description: Nightingale rose chart — explicit alias of radial column.
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
agcharts_webmcp_widget_display({name: "agcharts-nightingale", params: { data:[{x:'Mon',y:30},{x:'Tue',y:60}] }})
```
