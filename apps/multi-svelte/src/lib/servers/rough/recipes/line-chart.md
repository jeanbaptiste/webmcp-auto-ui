---
id: rough-line-chart
name: Line Chart
description: Single line chart showing trend over time
data:
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  values: [12, 19, 15, 25, 22, 30, 28]
  title: "Weekly Visitors"
---

## Line Chart

A single-series line chart with sketchy connectors and dots.

### Data format

- `labels` — x-axis labels (e.g., dates, categories)
- `values` — numeric values
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "line-chart", params: {labels: ["Mon","Tue","Wed","Thu","Fri"], values: [12,19,15,25,22], title: "Weekly Visitors"}})`
