---
widget: rough-stacked-bar
description: Stacked bars showing composition of each category
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
      description: Stacked data series
    title:
      type: string
      description: Chart title
---

## Stacked Bar Chart

Bars stacked to show part-to-whole relationships per category.

### Data format

- `labels` — category names
- `series` — array of `{name, values}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "stacked-bar", params: {labels: ["2021","2022","2023"], series: [{name: "Web", values: [40,55,70]}, {name: "Mobile", values: [30,45,50]}], title: "Revenue by Platform"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-stacked-bar", params: {labels: ["2021","2022","2023"], series: [{name: "Web", values: [40,55,70]}, {name: "Mobile", values: [30,45,50]}, {name: "API", values: [10,20,35]}], title: "Revenue by Platform"}})
```
