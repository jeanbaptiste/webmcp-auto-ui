---
widget: echarts-effect-scatter
description: Scatter plot with ripple animations — highlight a handful of notable points.
group: echarts
schema:
  type: object
  required: [points]
  properties:
    title: { type: string }
    points: { type: array, description: "[[x,y], ...]" }
    symbolSize: { type: number, description: Point size (default 15) }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Draw attention to a small set of highlighted data points. Avoid with > ~30 points (too noisy).

## Example
```
echarts_webmcp_widget_display({ name: "echarts-effect-scatter", params: {
  points: [[12, 88], [45, 62], [72, 30]],
  xLabel: "X", yLabel: "Y", title: "Anomalies"
}})
```
