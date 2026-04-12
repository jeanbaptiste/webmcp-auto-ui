---
widget: pixijs-heatmap
description: Color-coded heatmap grid rendered with WebGL for smooth transitions
schema:
  type: object
  properties:
    data:
      type: array
      items:
        type: array
        items:
          type: number
      description: 2D array of values (rows × columns)
    rowLabels:
      type: array
      items:
        type: string
    colLabels:
      type: array
      items:
        type: string
    title:
      type: string
    colorRange:
      type: array
      items:
        type: string
      description: Two hex colors for min/max gradient
  required:
    - data
---

## When to use

Use pixijs-heatmap for 2D data grids with color intensity. Ideal for:
- Correlation matrices
- Activity heatmaps (hours × days)
- Spatial data grids

## Examples

```json
{
  "data": [[1, 5, 3], [8, 2, 7], [4, 9, 1]],
  "rowLabels": ["Mon", "Tue", "Wed"],
  "colLabels": ["Morning", "Afternoon", "Evening"],
  "title": "Activity Heatmap"
}
```
