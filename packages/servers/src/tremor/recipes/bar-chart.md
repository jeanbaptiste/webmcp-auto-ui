---
widget: tremor-bar-chart
description: Bar chart for categorical comparisons (Tremor).
group: tremor
schema:
  type: object
  required: [data, index, categories]
  properties:
    title: { type: string }
    data: { type: array }
    index: { type: string }
    categories: { type: array }
    colors: { type: array }
    layout: { type: string, description: "vertical | horizontal" }
    stack: { type: boolean }
    showLegend: { type: boolean }
    showGridLines: { type: boolean }
---

## When to use
Compare numeric values across categories. Use `layout: 'horizontal'` for long labels.

## Example
```
tremor_webmcp_widget_display({name: "tremor-bar-chart", params: {
  data: [{name:'A', value: 10}, {name:'B', value: 20}],
  index:'name', categories:['value'], colors:['blue']
}})
```
