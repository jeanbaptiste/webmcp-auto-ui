---
id: rough-grouped-bar
name: Grouped Bar Chart
description: Side-by-side bars comparing multiple series across categories
data:
  labels: ["Jan", "Feb", "Mar", "Apr"]
  series:
    - name: "Product A"
      values: [30, 45, 60, 40]
    - name: "Product B"
      values: [50, 35, 70, 55]
  title: "Monthly Sales Comparison"
---

## Grouped Bar Chart

Multiple series displayed as adjacent bars per category.

### Data format

- `labels` — category names
- `series` — array of `{name, values}` objects
- `title` — optional chart title
