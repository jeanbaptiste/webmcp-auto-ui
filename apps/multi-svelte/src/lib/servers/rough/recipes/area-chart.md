---
widget: rough-area-chart
name: Area Chart
description: Filled area chart showing magnitude over time
data:
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
  values: [10, 25, 18, 35, 28, 42]
  title: "Growth Trend"
---

## Area Chart

Line chart with filled area beneath, using Rough.js hachure fill.

### Data format

- `labels` — x-axis labels
- `values` — numeric values
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "area-chart", params: {labels: ["Jan","Feb","Mar","Apr"], values: [10,25,18,35], title: "Growth Trend"}})`
