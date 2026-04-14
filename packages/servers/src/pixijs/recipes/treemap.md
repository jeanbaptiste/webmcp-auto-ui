---
widget: pixijs-treemap
description: Animated treemap with WebGL — nested rectangles sized by value
schema:
  type: object
  properties:
    data:
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
      description: Array of {label, value} items
    title:
      type: string
  required:
    - data
---

## When to use

Use pixijs-treemap for hierarchical or proportional data. Ideal for:
- Budget breakdowns
- Disk usage
- Market cap comparisons

## How
1. Call `pixijs_webmcp_widget_display({name: "treemap", params: {data: [{label: "JS", value: 60}, {label: "CSS", value: 25}, {label: "HTML", value: 15}]}})`

## Examples

```json
{
  "data": [
    {"label": "JS", "value": 60},
    {"label": "CSS", "value": 25},
    {"label": "HTML", "value": 15}
  ],
  "title": "Codebase Breakdown"
}
```
