---
widget: echarts-bar
description: Bar chart — vertical or horizontal, grouped or stacked, one or many series.
group: echarts
schema:
  type: object
  required: [categories, series]
  properties:
    title: { type: string, description: Chart title }
    categories: { type: array, description: X-axis category labels (or Y if horizontal) }
    series: { type: array, description: "Either a flat array of numbers, or [{ name, data:[] }, ...] for multi-series" }
    stack: { type: [string, boolean], description: "Stack id (truthy to stack, or string for custom stack id)" }
    horizontal: { type: boolean, description: Render horizontal bars (default false) }
    xLabel: { type: string, description: X-axis title }
    yLabel: { type: string, description: Y-axis title }
---

## When to use
Compare values across categories. Use `horizontal: true` for long category names, `stack: true` for part-to-whole.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-bar", params: {
  categories: ["Mon","Tue","Wed","Thu","Fri"],
  series: [
    { name: "Sales", data: [120, 200, 150, 80, 70] },
    { name: "Returns", data: [10, 30, 20, 15, 5] }
  ],
  stack: true, title: "Weekly sales"
}})
```
