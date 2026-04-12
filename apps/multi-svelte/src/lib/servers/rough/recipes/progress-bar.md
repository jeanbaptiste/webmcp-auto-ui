---
widget: rough-progress-bar
description: Horizontal progress bars showing completion percentage
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
            description: Progress item name
          value:
            type: number
            description: Current value
          max:
            type: number
            description: Maximum value (defaults to 100)
      description: Progress items to display
    title:
      type: string
      description: Chart title
---

## Progress Bar

Multiple horizontal bars showing completion toward a goal.

### Data format

- `items` — array of `{label, value, max?}` objects (max defaults to 100)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "progress-bar", params: {items: [{label: "Backend", value: 85}, {label: "Frontend", value: 60}], title: "Sprint Progress"}})`
