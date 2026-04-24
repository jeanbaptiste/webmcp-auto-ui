---
widget: tremor-spark-bar
description: Spark bar chart beside a title/metric (Tremor).
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
---

## When to use
Inline KPI bar-trend in compact dashboards.

## Example
```
tremor_webmcp_widget_display({name: "tremor-spark-bar", params: {
  title:'Orders', metric:'1,204',
  data:[{d:'M',v:5},{d:'T',v:8}], index:'d', categories:['v']
}})
```
