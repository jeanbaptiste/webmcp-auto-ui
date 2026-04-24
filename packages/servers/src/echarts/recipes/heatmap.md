---
widget: echarts-heatmap
description: Categorical heatmap — 2D grid of values with visual color legend.
group: echarts
schema:
  type: object
  required: [xCategories, yCategories, values]
  properties:
    title: { type: string }
    xCategories: { type: array, description: X-axis labels }
    yCategories: { type: array, description: Y-axis labels }
    values: { type: array, description: "[[xIdx, yIdx, value], ...]" }
    min: { type: number }
    max: { type: number }
---

## When to use
Visualize a matrix (confusion matrix, correlation matrix, schedule density, co-occurrence).

## Example
```
echarts_webmcp_widget_display({ name: "echarts-heatmap", params: {
  xCategories: ["Mon","Tue","Wed"],
  yCategories: ["Morning","Afternoon","Evening"],
  values: [[0,0,5],[0,1,2],[0,2,8],[1,0,6],[1,1,3],[1,2,7],[2,0,4],[2,1,9],[2,2,1]],
  title: "Activity"
}})
```
