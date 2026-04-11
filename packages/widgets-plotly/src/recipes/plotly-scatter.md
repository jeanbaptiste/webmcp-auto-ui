---
widget: plotly-scatter
description: Scatter plot (2D or 3D) with optional color categories and trendlines. Scientific data, correlations, clusters.
group: plotly
schema:
  type: object
  required:
    - x
    - y
  properties:
    title:
      type: string
      description: Chart title
    x:
      type: array
      description: X-axis values (numbers)
      items:
        type: number
    y:
      type: array
      description: Y-axis values (numbers)
      items:
        type: number
    z:
      type: array
      description: Z-axis values for 3D scatter (omit for 2D)
      items:
        type: number
    categories:
      type: array
      description: Category label per point (for color grouping)
      items:
        type: string
    mode:
      type: string
      description: "Plotly trace mode: 'markers', 'lines', 'lines+markers' (default 'markers')"
    xLabel:
      type: string
      description: X-axis label
    yLabel:
      type: string
      description: Y-axis label
    zLabel:
      type: string
      description: Z-axis label (3D only)
    markerSize:
      type: number
      description: Marker size in pixels (default 6)
---

## When to use

Display correlations, clusters, or time-series as a scatter plot. Supports 2D and 3D.
Pass a `z` array to switch to 3D mode automatically.

## How

Call `widget_display('plotly-scatter', { x: [...], y: [...] })`.

For colored categories, pass a `categories` array with a label per point.

Example -- iris dataset:
```
widget_display('plotly-scatter', {
  title: "Sepal vs Petal Length",
  x: [5.1, 4.9, 7.0, 6.3],
  y: [1.4, 1.4, 4.7, 4.9],
  categories: ["setosa", "setosa", "versicolor", "virginica"],
  xLabel: "Sepal Length",
  yLabel: "Petal Length"
})
```

## Common errors

- x and y arrays must have the same length
- If z is provided, it must also have the same length as x and y
- categories array (if provided) must match the length of x/y
