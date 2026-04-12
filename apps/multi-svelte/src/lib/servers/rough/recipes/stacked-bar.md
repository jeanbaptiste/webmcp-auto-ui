---
id: rough-stacked-bar
name: Stacked Bar Chart
description: Stacked bars showing composition of each category
data:
  labels: ["2021", "2022", "2023"]
  series:
    - name: "Web"
      values: [40, 55, 70]
    - name: "Mobile"
      values: [30, 45, 50]
    - name: "Desktop"
      values: [20, 15, 10]
  title: "Revenue by Platform"
---

## Stacked Bar Chart

Bars stacked to show part-to-whole relationships per category.

### Data format

- `labels` — category names
- `series` — array of `{name, values}` objects
- `title` — optional chart title
