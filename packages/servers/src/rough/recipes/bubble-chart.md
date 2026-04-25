---
widget: rough-bubble-chart
description: Scatter plot with variable-size bubbles representing a third dimension
schema:
  type: object
  required:
    - bubbles
  properties:
    bubbles:
      type: array
      items:
        type: object
        required:
          - x
          - "y"
          - r
        properties:
          x:
            type: number
            description: X coordinate
          "y":
            type: number
            description: Y coordinate
          r:
            type: number
            description: Bubble radius
          label:
            type: string
            description: Optional bubble label
      description: Array of bubbles with position and size
    title:
      type: string
      description: Chart title
---

## Bubble Chart

Like a scatter plot but with a third dimension (radius).

### Data format

- `bubbles` — array of `{x, y, r, label?}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "bubble-chart", params: {bubbles: [{x: 20, y: 30, r: 10, label: "Small"}, {x: 50, y: 60, r: 30, label: "Large"}], title: "Market Segments"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-bubble-chart", params: {bubbles: [{x: 20, y: 30, r: 15, label: "Alpha"}, {x: 50, y: 60, r: 30, label: "Beta"}, {x: 75, y: 40, r: 20, label: "Gamma"}], title: "Market Segments"}})
```
