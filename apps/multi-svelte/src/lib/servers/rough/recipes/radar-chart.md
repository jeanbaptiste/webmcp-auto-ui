---
id: rough-radar-chart
name: Radar Chart
description: Spider/radar chart showing multivariate data on radial axes
data:
  labels: ["Speed", "Power", "Range", "Durability", "Accuracy"]
  values: [8, 6, 9, 4, 7]
  max: 10
  title: "Character Stats"
---

## Radar Chart

Polygon on radial axes, ideal for comparing multiple attributes.

### Data format

- `labels` — axis names
- `values` — values per axis
- `max` — maximum scale value (optional, defaults to max of values)
- `title` — optional chart title
