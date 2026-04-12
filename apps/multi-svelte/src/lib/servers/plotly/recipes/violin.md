---
widget: plotly-violin
description: Violin plot — distribution shape + box plot combined.
group: plotly
schema:
  type: object
  required: [y]
  properties:
    title: { type: string, description: Chart title }
    y: { type: array, description: "Data (flat array or array of arrays)" }
    x: { type: array, items: { type: string }, description: Category per point }
    name: { type: array, items: { type: string }, description: Group names }
    box: { type: boolean, description: Show inner box plot (default true) }
    meanline: { type: boolean, description: Show mean line (default true) }
    points: { type: string, description: "'outliers' (default), 'all', false" }
---

## When to use
Compare distribution shapes across groups (more detail than box plot).

## Example
```
plotly_webmcp_widget_display({name: "plotly-violin", params: { y: [[1,2,3,4,5,3,2],[5,6,7,8,7,6,5]], name: ['A','B'] }})
```
