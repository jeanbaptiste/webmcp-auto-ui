---
id: rough-donut-chart
name: Donut Chart
description: Pie chart with hollow center showing total
data:
  labels: ["Rent", "Food", "Transport", "Entertainment"]
  values: [1200, 400, 200, 150]
  title: "Monthly Budget"
---

## Donut Chart

Pie chart with a hole in the center, displaying the total sum.

### Data format

- `labels` — segment labels
- `values` — numeric values
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "donut-chart", params: {labels: ["Rent","Food","Transport"], values: [1200,400,200], title: "Monthly Budget"}})`
