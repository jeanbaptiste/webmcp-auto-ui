---
widget: agcharts-box-plot
description: Box plot — visualize quartile distribution per category.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Rows like {x, min, q1, median, q3, max}" }
    xKey: { type: string }
    minKey: { type: string }
    q1Key: { type: string }
    medianKey: { type: string }
    q3Key: { type: string }
    maxKey: { type: string }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-box-plot", params: { data:[{x:'A',min:1,q1:3,median:5,q3:7,max:10}] }})
```
