---
widget: echarts-boxplot
description: Box-and-whisker plot — distribution (min, Q1, median, Q3, max) across categories.
group: echarts
schema:
  type: object
  required: [categories, boxData]
  properties:
    title: { type: string }
    categories: { type: array, description: Category labels, one per box }
    boxData: { type: array, description: "[[min, Q1, median, Q3, max], ...] — one quintuple per category" }
    yLabel: { type: string }
---

## When to use
Compare distributions across groups (variance, skew, outliers). Compute quartiles upstream.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-boxplot", params: {
  categories: ["Control","Treatment"],
  boxData: [[5, 12, 18, 24, 32], [8, 15, 22, 28, 40]],
  yLabel: "Score", title: "A/B distribution"
}})
```
