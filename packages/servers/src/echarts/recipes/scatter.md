---
widget: echarts-scatter
description: Scatter plot — correlation between two quantitative variables, optional bubble size.
group: echarts
schema:
  type: object
  properties:
    title: { type: string }
    points: { type: array, description: "Flat [[x,y], ...] or [[x,y,size], ...] for single series" }
    series: { type: array, description: "Multi-series: [{ name, data:[[x,y,size?], ...] }, ...]" }
    symbolSize: { type: number, description: Default point size (ignored when size given in data) }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Explore correlation or clusters. Add a third column in each point for bubble size (bubble chart).

## Example
```
echarts_webmcp_widget_display({ name: "echarts-scatter", params: {
  points: [[10,8,20],[15,12,35],[22,19,15],[30,27,40]],
  xLabel: "Age", yLabel: "Income", title: "Age vs Income (size = weight)"
}})
```
