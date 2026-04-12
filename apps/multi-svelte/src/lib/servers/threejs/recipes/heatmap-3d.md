---
widget: heatmap-3d
description: 3D elevated heatmap with colored bars per cell. Matrix data, correlation.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    values:
      type: array
      description: 2D array of values
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
    colorHigh:
      type: string
    heightScale:
      type: number
---

## When to use

Display matrix data as a 3D elevated heatmap where height and color encode value.

## How

```
widget_display('heatmap-3d', {
  title: "Correlation Matrix",
  values: [
    [1.0, 0.8, 0.2],
    [0.8, 1.0, 0.5],
    [0.2, 0.5, 1.0]
  ],
  colorLow: "#000066",
  colorHigh: "#ff4400"
})
```
