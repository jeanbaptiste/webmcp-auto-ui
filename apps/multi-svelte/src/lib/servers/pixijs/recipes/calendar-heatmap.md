---
widget: pixijs-calendar-heatmap
description: GitHub-style calendar heatmap — day-by-day activity grid
schema:
  type: object
  properties:
    data:
      type: array
      items:
        type: object
        properties:
          date:
            type: string
            description: Date string (YYYY-MM-DD)
          value:
            type: number
      description: Array of {date, value} entries
    color:
      type: string
      description: Base color for intensity (hex, default green)
    title:
      type: string
  required:
    - data
---

## When to use

Use pixijs-calendar-heatmap for daily activity visualization. Ideal for:
- Commit activity (GitHub style)
- Habit tracking
- Daily metrics

## Examples

```json
{
  "data": [
    {"date": "2025-01-01", "value": 3},
    {"date": "2025-01-02", "value": 7},
    {"date": "2025-01-03", "value": 1},
    {"date": "2025-01-04", "value": 5}
  ],
  "title": "Commit Activity",
  "color": "#22c55e"
}
```
