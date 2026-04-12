---
widget: rough-error-bar
name: Error Bar Chart
description: Points with error bars showing uncertainty range
data:
  points:
    - { label: "Exp 1", value: 45, error: 8 }
    - { label: "Exp 2", value: 52, error: 5 }
    - { label: "Exp 3", value: 48, error: 12 }
    - { label: "Exp 4", value: 60, error: 6 }
  title: "Measurement Uncertainty"
---

## Error Bar Chart

Data points with vertical error bars indicating uncertainty.

### Data format

- `points` — array of `{label, value, error}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "error-bar", params: {points: [{label: "Exp 1", value: 45, error: 8}, {label: "Exp 2", value: 52, error: 5}], title: "Measurement Uncertainty"}})`
