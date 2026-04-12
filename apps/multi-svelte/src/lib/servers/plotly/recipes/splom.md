---
widget: plotly-splom
description: Scatter plot matrix (SPLOM) — pairwise scatter of multiple dimensions.
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
      description: Array of dimension objects with label and values
    text: { type: array, items: { type: string }, description: Point labels }
    markerSize: { type: number, description: Marker size (default 4) }
    color: { type: array, items: { type: number }, description: Color values }
---

## When to use
Explore correlations between multiple variables simultaneously.

## Example
```
plotly_webmcp_widget_display({name: "plotly-splom", params: { dimensions: [{ label: 'X', values: [1,2,3] }, { label: 'Y', values: [4,5,6] }, { label: 'Z', values: [7,8,9] }] }})
```
