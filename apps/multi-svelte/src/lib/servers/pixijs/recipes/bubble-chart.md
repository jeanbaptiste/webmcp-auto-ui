---
widget: pixijs-bubble-chart
description: Animated bubble chart — circles sized by value with physics-based settling
schema:
  type: object
  properties:
    bubbles:
      type: array
      items:
        type: object
        properties:
          label:
            type: string
          value:
            type: number
          color:
            type: string
      description: Array of {label, value} bubble items
    title:
      type: string
  required:
    - bubbles
---

## When to use

Use pixijs-bubble-chart for proportional comparisons with animated circles. Ideal for:
- Market share visualization
- Population comparisons
- Budget proportions

## How
1. Call `pixijs_webmcp_widget_display({name: "bubble-chart", params: {bubbles: [{label: "A", value: 65}, {label: "B", value: 25}], title: "Share"}})`

## Examples

```json
{
  "bubbles": [
    {"label": "Chrome", "value": 65},
    {"label": "Firefox", "value": 15},
    {"label": "Safari", "value": 12},
    {"label": "Edge", "value": 8}
  ],
  "title": "Browser Market Share"
}
```
