---
widget: rough-heatmap
name: Heatmap
description: Matrix of colored cells representing value intensity
data:
  rows: ["Mon", "Tue", "Wed", "Thu", "Fri"]
  cols: ["9am", "12pm", "3pm", "6pm"]
  values:
    - [2, 5, 8, 3]
    - [4, 7, 6, 2]
    - [1, 9, 5, 4]
    - [6, 3, 7, 8]
    - [3, 4, 2, 9]
  title: "Activity Heatmap"
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
