---
widget: tremor-spark-area
description: Spark area chart beside a title/metric (Tremor).
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
Inline KPI trends — compact dashboards.

## Example
```
tremor_webmcp_widget_display({name: "tremor-spark-area", params: {
  title:'Revenue', metric:'$12.4k',
  data:[{x:1,y:10},{x:2,y:15},{x:3,y:12}], index:'x', categories:['y']
}})
```
