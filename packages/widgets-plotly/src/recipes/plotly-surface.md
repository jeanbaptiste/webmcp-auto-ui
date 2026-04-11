---
widget: plotly-surface
description: 3D surface plot from a z-matrix. Topography, heatmaps with elevation, mathematical functions.
group: plotly
schema:
  type: object
  required:
    - z
  properties:
    title:
      type: string
      description: Chart title
    z:
      type: array
      description: 2D array of z-values (rows x cols)
      items:
        type: array
        items:
          type: number
    x:
      type: array
      description: X-axis tick values (length must match columns of z)
      items:
        type: number
    y:
      type: array
      description: Y-axis tick values (length must match rows of z)
      items:
        type: number
    colorscale:
      type: string
      description: "Plotly colorscale name: 'Viridis', 'Plasma', 'Inferno', 'Cividis', 'Hot', 'Earth' (default 'Viridis')"
    xLabel:
      type: string
      description: X-axis label
    yLabel:
      type: string
      description: Y-axis label
    zLabel:
      type: string
      description: Z-axis label
    showContours:
      type: boolean
      description: Show contour lines on the surface (default false)
---

## When to use

Display a 3D surface from a matrix of values. Useful for topographic data, mathematical
function visualizations (z = f(x, y)), heatmaps with depth.

## How

Call `widget_display('plotly-surface', { z: [[...], [...], ...] })`.

The z matrix is a 2D array where `z[row][col]` is the height at that grid point.

Example -- sinusoidal surface:
```
widget_display('plotly-surface', {
  title: "sin(x) * cos(y)",
  z: [
    [0.0, 0.84, 0.91],
    [0.0, 0.45, 0.49],
    [0.0, -0.76, -0.83]
  ],
  colorscale: "Viridis"
})
```

## Common errors

- z must be a 2D array (array of arrays), not a flat array
- All inner arrays must have the same length
- If x is provided, its length must match the number of columns in z
- If y is provided, its length must match the number of rows in z
