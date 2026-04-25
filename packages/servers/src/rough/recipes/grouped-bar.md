---
widget: rough-grouped-bar
description: Side-by-side bars comparing multiple series across categories
schema:
  type: object
  required:
    - labels
    - series
  properties:
    labels:
      type: array
      items:
        type: string
      description: Category names
    series:
      type: array
      items:
        type: object
        required:
          - name
          - values
        properties:
          name:
            type: string
            description: Series name
          values:
            type: array
            items:
              type: number
            description: Values for each category
      description: Data series to compare
    title:
      type: string
      description: Chart title
---

## Grouped Bar Chart

Multiple series displayed as adjacent bars per category.

### Data format

- `labels` — category names
- `series` — array of `{name, values}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "grouped-bar", params: {labels: ["Jan","Feb","Mar"], series: [{name: "A", values: [30,45,60]}, {name: "B", values: [50,35,70]}], title: "Sales Comparison"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-grouped-bar", params: {labels: ["Jan","Feb","Mar","Apr"], series: [{name: "Online", values: [30,45,60,75]}, {name: "In-Store", values: [50,40,55,65]}], title: "Sales by Channel"}})
```
