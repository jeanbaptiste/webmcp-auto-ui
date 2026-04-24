---
widget: echarts-treemap
description: Treemap — nested rectangles sized by value, drill-down on click.
group: echarts
schema:
  type: object
  required: [nodes]
  properties:
    title: { type: string }
    nodes: { type: array, description: "[{ name, value, children?: [...] }, ...]" }
---

## When to use
Compare many quantities within a hierarchy (budget breakdown, codebase size, market cap).

## Example
```
echarts_webmcp_widget_display({ name: "echarts-treemap", params: {
  nodes: [
    { name: "Engineering", value: 40, children: [{name:"Frontend",value:22},{name:"Backend",value:18}]},
    { name: "Sales", value: 25 },
    { name: "Ops", value: 15 }
  ],
  title: "Budget"
}})
```
