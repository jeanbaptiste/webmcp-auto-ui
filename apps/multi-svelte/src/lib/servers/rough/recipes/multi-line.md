---
id: rough-multi-line
name: Multi-Line Chart
description: Multiple line series on the same axes for comparison
data:
  labels: ["Q1", "Q2", "Q3", "Q4"]
  series:
    - name: "Revenue"
      values: [100, 150, 130, 200]
    - name: "Costs"
      values: [80, 90, 110, 120]
  title: "Revenue vs Costs"
---

## Multi-Line Chart

Compare multiple trends on a shared axis.

### Data format

- `labels` — shared x-axis labels
- `series` — array of `{name, values}` objects
- `title` — optional chart title
