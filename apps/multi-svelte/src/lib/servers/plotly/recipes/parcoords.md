---
widget: plotly-parcoords
description: Parallel coordinates plot — multi-dimensional data exploration.
group: plotly
schema:
  type: object
  required: [dimensions]
  properties:
    title: { type: string, description: Chart title }
    dimensions:
      type: array
      items:
        type: object
        properties:
          label: { type: string }
          values: { type: array, items: { type: number } }
          range: { type: array, items: { type: number } }
      description: Dimension objects with label, values, optional range
    lineColor: { type: array, items: { type: number }, description: Color values per line }
    colorscale: { type: string, description: "Colorscale (default 'Viridis')" }
---

## When to use
Explore high-dimensional data, find patterns and filter interactively.

## Example
```
widget_display('plotly-parcoords', { dimensions: [{ label: 'A', values: [1,4,2] }, { label: 'B', values: [3,1,5] }], lineColor: [1, 2, 3] })
```
