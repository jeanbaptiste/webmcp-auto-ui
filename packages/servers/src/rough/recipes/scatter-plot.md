---
widget: rough-scatter-plot
description: XY scatter plot showing relationships between variables
schema:
  type: object
  required:
    - points
  properties:
    points:
      type: array
      items:
        type: object
        required:
          - x
          - "y"
        properties:
          x:
            type: number
            description: X coordinate
          "y":
            type: number
            description: Y coordinate
          label:
            type: string
            description: Optional point label
      description: Data points to plot
    title:
      type: string
      description: Chart title
---

## Scatter Plot

Individual data points plotted by x/y coordinates.

### Data format

- `points` — array of `{x, y, label?}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "scatter-plot", params: {points: [{x: 10, y: 20}, {x: 30, y: 45}, {x: 50, y: 35}], title: "Correlation Study"}})`
