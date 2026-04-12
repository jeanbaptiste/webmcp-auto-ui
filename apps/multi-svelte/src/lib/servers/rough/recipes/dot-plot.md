---
widget: rough-dot-plot
description: Horizontal dot plot comparing values across categories
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
          - value
        properties:
          label:
            type: string
            description: Category name
          value:
            type: number
            description: Numeric value
      description: Data points to plot
    title:
      type: string
      description: Chart title
---

## Dot Plot

Horizontal positions of dots on category rows.

### Data format

- `items` — array of `{label, value}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "dot-plot", params: {items: [{label: "Marketing", value: 85}, {label: "Engineering", value: 92}], title: "Team Satisfaction"}})`
