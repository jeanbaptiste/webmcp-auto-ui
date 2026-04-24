---
widget: echarts-parallel
description: Parallel coordinates — each row of a high-dimensional dataset as a polyline.
group: echarts
schema:
  type: object
  required: [dimensions, values]
  properties:
    title: { type: string }
    dimensions: { type: array, description: "[{ name, type?: 'value'|'category' }, ...]" }
    values: { type: array, description: "[[v0, v1, v2, ...], ...] — same length as dimensions" }
---

## When to use
Explore multidimensional datasets (>4 dims) and spot correlations or clusters visually.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-parallel", params: {
  dimensions: [
    { name: "Price" }, { name: "Weight" }, { name: "Power" }, { name: "Score" }
  ],
  values: [[30,1.2,120,78], [45,1.8,180,85], [22,0.9,90,70]],
  title: "Models"
}})
```
