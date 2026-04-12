---
widget: rough-scatter-plot
name: Scatter Plot
description: XY scatter plot showing relationships between variables
data:
  points:
    - { x: 10, y: 20, label: "A" }
    - { x: 30, y: 45, label: "B" }
    - { x: 50, y: 35, label: "C" }
    - { x: 70, y: 60, label: "D" }
    - { x: 90, y: 80, label: "E" }
  title: "Correlation Study"
---

## Scatter Plot

Individual data points plotted by x/y coordinates.

### Data format

- `points` — array of `{x, y, label?}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "scatter-plot", params: {points: [{x: 10, y: 20}, {x: 30, y: 45}, {x: 50, y: 35}], title: "Correlation Study"}})`
