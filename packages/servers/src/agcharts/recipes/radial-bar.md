---
widget: agcharts-radial-bar
description: Radial bar — bars wrapped around a polar axis.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    angleKey: { type: string, description: "Numeric value (default 'y')" }
    categoryKey: { type: string, description: "Category radius (default 'x')" }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-radial-bar", params: { data:[{x:'A',y:30},{x:'B',y:60}] }})
```
