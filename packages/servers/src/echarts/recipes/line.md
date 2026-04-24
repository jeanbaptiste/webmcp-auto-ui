---
widget: echarts-line
description: Line chart — trends over ordered categories. Supports smoothing, area fill, stacking.
group: echarts
schema:
  type: object
  required: [categories, series]
  properties:
    title: { type: string }
    categories: { type: array, description: X-axis labels (time or category) }
    series: { type: array, description: "Flat array of numbers OR [{ name, data }, ...]" }
    smooth: { type: boolean, description: Smooth curves (default false) }
    area: { type: boolean, description: Fill area under line (default false) }
    stack: { type: [string, boolean], description: Stack id }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Show trends over an ordered axis (time or continuous categories). Combine `area:true` + `stack:true` for stacked area.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-line", params: {
  categories: ["Jan","Feb","Mar","Apr","May"],
  series: [{ name: "Revenue", data: [10, 22, 19, 31, 42] }],
  smooth: true, area: true, title: "Monthly revenue"
}})
```
