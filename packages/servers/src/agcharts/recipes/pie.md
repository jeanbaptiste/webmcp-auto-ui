---
widget: agcharts-pie
description: Pie chart. Show proportions of a small set of categories.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    x: { type: array }
    y: { type: array }
    angleKey: { type: string, description: "Numeric key for slice size (default 'y')" }
    labelKey: { type: string, description: "Category key (default 'x')" }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-pie", params: { data:[{x:'A',y:30},{x:'B',y:70}], title:'Share' }})
```
