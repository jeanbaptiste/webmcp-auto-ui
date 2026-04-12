---
widget: rough-pie-chart
name: Pie Chart
description: Circular chart showing proportions of a whole
data:
  labels: ["Desktop", "Mobile", "Tablet"]
  values: [55, 35, 10]
  title: "Device Usage"
---

## Pie Chart

Classic pie chart with hand-drawn arcs and hachure fills.

### Data format

- `labels` — slice labels
- `values` — numeric values (proportions)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "pie-chart", params: {labels: ["Desktop","Mobile","Tablet"], values: [55,35,10], title: "Device Usage"}})`
