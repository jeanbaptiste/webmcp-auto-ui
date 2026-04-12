---
widget: pixijs-sparkline
description: Compact inline sparkline chart — minimal line graph for embedding
schema:
  type: object
  properties:
    values:
      type: array
      items:
        type: number
      description: Data points
    color:
      type: string
      description: Line color (hex)
    fill:
      type: boolean
      description: Fill area under the line (default false)
    title:
      type: string
    height:
      type: number
      description: Chart height in pixels (default 60)
  required:
    - values
---

## When to use

Use pixijs-sparkline for compact inline trend indicators. Ideal for:
- Dashboard KPI cards
- Table cell visualizations
- Compact trend displays

## Examples

```json
{
  "values": [5, 10, 8, 15, 12, 20, 18, 25],
  "color": "#3b82f6",
  "fill": true,
  "title": "Weekly Trend"
}
```
