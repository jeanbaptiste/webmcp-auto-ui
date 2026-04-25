---
widget: rough-box-plot
description: Statistical distribution showing median, quartiles, and range
schema:
  type: object
  required:
    - groups
  properties:
    groups:
      type: array
      items:
        type: object
        required:
          - label
          - min
          - q1
          - median
          - q3
          - max
        properties:
          label:
            type: string
            description: Group name
          min:
            type: number
            description: Minimum value
          q1:
            type: number
            description: First quartile
          median:
            type: number
            description: Median value
          q3:
            type: number
            description: Third quartile
          max:
            type: number
            description: Maximum value
      description: Statistical groups with box plot data
    title:
      type: string
      description: Chart title
---

## Box Plot

Shows statistical summary (min, Q1, median, Q3, max) per group.

### Data format

- `groups` — array of `{label, min, q1, median, q3, max}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "box-plot", params: {groups: [{label: "Team A", min: 10, q1: 25, median: 40, q3: 55, max: 70}, {label: "Team B", min: 20, q1: 35, median: 50, q3: 65, max: 80}], title: "Performance Distribution"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-box-plot", params: {groups: [{label: "Group A", min: 10, q1: 25, median: 40, q3: 55, max: 70}, {label: "Group B", min: 20, q1: 35, median: 50, q3: 65, max: 80}], title: "Score Distribution"}})
```
