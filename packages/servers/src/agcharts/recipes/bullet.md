---
widget: agcharts-bullet
description: Bullet chart — single measure with target marker.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Rows like {x, y, target}" }
    xKey: { type: string }
    valueKey: { type: string }
    targetKey: { type: string }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-bullet", params: { data:[{x:'KPI',y:72,target:80}] }})
```
