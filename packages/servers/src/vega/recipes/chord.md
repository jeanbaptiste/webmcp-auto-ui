---
widget: vega-chord
description: Chord-like diagram — circular nodes with weighted links between them.
group: vega
schema:
  type: object
  required: [matrix, labels]
  properties:
    title: { type: string }
    matrix: { type: array, description: Square 2D array of flow values between nodes }
    labels: { type: array, description: Node labels (one per row/column) }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-chord", params: { labels:["A","B","C","D"], matrix:[[0,5,2,1],[3,0,4,2],[1,2,0,3],[4,1,2,0]] } })
```
