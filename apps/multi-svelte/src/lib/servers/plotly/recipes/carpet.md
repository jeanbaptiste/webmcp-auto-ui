---
widget: plotly-carpet
description: Carpet plot — curvilinear coordinate grid (a, b parametric axes).
group: plotly
schema:
  type: object
  required: [a, b, x, y]
  properties:
    title: { type: string, description: Chart title }
    a: { type: array, items: { type: number }, description: A-axis parameter values }
    b: { type: array, items: { type: number }, description: B-axis parameter values }
    x: { type: array, items: { type: array, items: { type: number } }, description: X coordinates grid }
    y: { type: array, items: { type: array, items: { type: number } }, description: Y coordinates grid }
    carpet: { type: string, description: "Carpet ID (default 'carpet1')" }
---

## When to use
Display curvilinear grids for aerodynamics, thermodynamics, or parametric studies.

## Example
```
plotly_webmcp_widget_display({name: "plotly-carpet", params: { a: [1,2,3], b: [1,2,3], x: [[1,2,3],[1.5,2.5,3.5],[2,3,4]], y: [[1,1,1],[2,2,2],[3,3,3]] }})
```
