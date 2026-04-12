---
widget: rough-treemap
description: Nested rectangles representing hierarchical data by area
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
            description: Item name
          value:
            type: number
            description: Numeric value (determines area)
      description: Items sized by value
    title:
      type: string
      description: Chart title
---

## Treemap

Rectangles sized by value, with hachure fill for sketch style.

### Data format

- `items` — array of `{label, value}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "treemap", params: {items: [{label: "JavaScript", value: 40}, {label: "Python", value: 30}, {label: "Rust", value: 10}], title: "Language Popularity"}})`
