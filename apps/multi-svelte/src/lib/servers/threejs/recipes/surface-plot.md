---
widget: surface-plot
description: 3D surface from a grid of Z values. Mathematical functions, terrain-like data.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    zValues:
      type: array
      description: 2D array of Z heights (rows x cols)
      items:
        type: array
        items:
          type: number
    rows:
      type: number
    cols:
      type: number
    colorLow:
      type: string
      description: Color at minimum Z (default #0000ff)
    colorHigh:
      type: string
      description: Color at maximum Z (default #ff0000)
---

## When to use

Visualize mathematical surfaces, 2D functions f(x,y)=z, or gridded height data.

## How

```
widget_display('surface-plot', {
  title: "sin(x)*cos(y)",
  zValues: [[0, 0.5, 0], [-0.5, 1, 0.5], [0, -0.5, 0]],
  colorLow: "#0000ff",
  colorHigh: "#ff0000"
})
```
