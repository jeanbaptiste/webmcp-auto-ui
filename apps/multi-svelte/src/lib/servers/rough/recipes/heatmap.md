---
widget: rough-heatmap
description: Matrix of colored cells representing value intensity
schema:
  type: object
  required:
    - rows
    - cols
    - values
  properties:
    rows:
      type: array
      items:
        type: string
      description: Row labels
    cols:
      type: array
      items:
        type: string
      description: Column labels
    values:
      type: array
      items:
        type: array
        items:
          type: number
      description: 2D array of numbers (rows x cols)
    title:
      type: string
      description: Chart title
---

## Heatmap

Grid of cells colored by intensity value.

### Data format

- `rows` — row labels
- `cols` — column labels
- `values` — 2D array of numbers (rows x cols)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "heatmap", params: {rows: ["Mon","Tue","Wed"], cols: ["9am","12pm","3pm"], values: [[2,5,8],[4,7,6],[1,9,5]], title: "Activity Heatmap"}})`
