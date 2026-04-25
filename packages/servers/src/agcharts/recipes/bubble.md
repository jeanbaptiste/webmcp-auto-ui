---
widget: agcharts-bubble
description: Bubble chart. Three numeric dimensions (x, y, size).
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Rows like {x, y, size}" }
    xKey: { type: string }
    yKey: { type: string }
    sizeKey: { type: string }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-bubble", params: { data:[{x:1,y:2,size:10},{x:3,y:5,size:30}], title:'GDP vs Life vs Pop' }})
```
