---
widget: tremor-spark-line
description: Spark line chart beside a title/metric (Tremor).
group: tremor
schema:
  type: object
  required: [data, index, categories]
  properties:
    title: { type: string }
    metric: { type: ["string","number"] }
    data: { type: array }
    index: { type: string }
    categories: { type: array }
    colors: { type: array }
    curveType: { type: string }
---

## When to use
Inline KPI line-trend.

## Example
```
tremor_webmcp_widget_display({name: "tremor-spark-line", params: {
  title:'Users', metric:'8.2k',
  data:[{x:1,y:3},{x:2,y:4}], index:'x', categories:['y']
}})
```
