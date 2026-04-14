---
widget: rough-slope-chart
description: Shows change between two points in time per item
schema:
  type: object
  required:
    - items
  properties:
    items:
      type: array
      items:
        type: object
        required:
          - label
          - start
          - end
        properties:
          label:
            type: string
            description: Item name
          start:
            type: number
            description: Value at start period
          end:
            type: number
            description: Value at end period
      description: Items showing change over two periods
    startLabel:
      type: string
      description: Label for the start column
    endLabel:
      type: string
      description: Label for the end column
    title:
      type: string
      description: Chart title
---

## Slope Chart

Two vertical axes connected by lines showing change direction.

### Data format

- `items` — array of `{label, start, end}` objects
- `startLabel` / `endLabel` — column headers
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "slope-chart", params: {items: [{label: "Product A", start: 40, end: 65}, {label: "Product B", start: 55, end: 45}], startLabel: "2023", endLabel: "2024", title: "Year-over-Year Change"}})`
