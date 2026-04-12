---
widget: plotly-box
description: Box plot for statistical distribution visualization.
group: plotly
schema:
  type: object
  required: [y]
  properties:
    title: { type: string, description: Chart title }
    y: { type: array, description: "Data values (flat array or array of arrays for multiple groups)" }
    x: { type: array, items: { type: string }, description: Category per data point (for grouped box) }
    name: { type: array, items: { type: string }, description: Group names (when y is array of arrays) }
    boxpoints: { type: string, description: "'outliers' (default), 'all', 'suspectedoutliers', false" }
    notched: { type: boolean, description: Show notched box (default false) }
---

## When to use
Compare distributions across groups. Shows median, quartiles, outliers.

## Example
```
widget_display('plotly-box', { y: [[1,2,3,4,5,6,7],[3,4,5,6,7,8,9]], name: ['A','B'], title: 'Distribution' })
```
