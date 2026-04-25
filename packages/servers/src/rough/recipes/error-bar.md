---
widget: rough-error-bar
description: Points with error bars showing uncertainty range
schema:
  type: object
  required:
    - points
  properties:
    points:
      type: array
      items:
        type: object
        required:
          - label
          - value
          - error
        properties:
          label:
            type: string
            description: Data point label
          value:
            type: number
            description: Central value
          error:
            type: number
            description: Error margin (symmetric)
      description: Data points with error margins
    title:
      type: string
      description: Chart title
---

## Error Bar Chart

Data points with vertical error bars indicating uncertainty.

### Data format

- `points` — array of `{label, value, error}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "error-bar", params: {points: [{label: "Exp 1", value: 45, error: 8}, {label: "Exp 2", value: 52, error: 5}], title: "Measurement Uncertainty"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-error-bar", params: {points: [{label: "Control", value: 45, error: 8}, {label: "Treatment A", value: 62, error: 5}, {label: "Treatment B", value: 58, error: 10}], title: "Experiment Results"}})
```
