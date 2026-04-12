---
id: rough-waterfall
name: Waterfall Chart
description: Shows cumulative effect of sequential positive/negative values
data:
  labels: ["Start", "Sales", "Returns", "Costs", "Tax", "Net"]
  values: [100, 60, -20, -40, -15, 0]
  title: "Profit Breakdown"
---

## Waterfall Chart

Sequential bars showing how an initial value is modified by increments.

### Data format

- `labels` — step labels
- `values` — incremental values (positive adds, negative subtracts)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "waterfall", params: {labels: ["Start","Sales","Returns","Costs","Net"], values: [100,60,-20,-40,0], title: "Profit Breakdown"}})`
