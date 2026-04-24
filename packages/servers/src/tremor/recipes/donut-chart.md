---
widget: tremor-donut-chart
description: Donut or pie chart for proportions (Tremor).
group: tremor
schema:
  type: object
  required: [data, index, category]
  properties:
    title: { type: string }
    data: { type: array }
    index: { type: string, description: Key of label field }
    category: { type: string, description: Key of numeric value field }
    colors: { type: array }
    variant: { type: string, description: "donut | pie" }
    showLabel: { type: boolean }
---

## When to use
Show part-to-whole proportions across a small number of categories (<7 ideally).

## Example
```
tremor_webmcp_widget_display({name: "tremor-donut-chart", params: {
  data: [{name:'A', sales:980},{name:'B', sales:456}],
  index:'name', category:'sales'
}})
```
