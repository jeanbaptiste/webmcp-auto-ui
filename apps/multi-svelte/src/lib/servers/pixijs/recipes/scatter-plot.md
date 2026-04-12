---
widget: pixijs-scatter-plot
description: Scatter plot with animated points — WebGL-accelerated for large datasets
schema:
  type: object
  properties:
    points:
      type: array
      items:
        type: object
        properties:
          x:
            type: number
          y:
            type: number
          label:
            type: string
          size:
            type: number
      description: Array of {x, y} points with optional label and size
    title:
      type: string
    color:
      type: string
      description: Point color (hex)
    xLabel:
      type: string
    yLabel:
      type: string
  required:
    - points
---

## When to use

Use pixijs-scatter-plot for large scatter datasets rendered on the GPU. Ideal for:
- Correlation analysis
- Cluster visualization
- Large point clouds (1000+ points)

## Examples

```json
{
  "points": [
    {"x": 1, "y": 5}, {"x": 3, "y": 8}, {"x": 5, "y": 2},
    {"x": 7, "y": 9}, {"x": 9, "y": 4}
  ],
  "title": "Height vs Weight",
  "xLabel": "Height",
  "yLabel": "Weight"
}
```
