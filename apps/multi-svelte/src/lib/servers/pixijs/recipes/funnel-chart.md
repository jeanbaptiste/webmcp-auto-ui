---
widget: pixijs-funnel-chart
description: Animated funnel chart — tapering stages from top to bottom
schema:
  type: object
  properties:
    stages:
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
      description: Funnel stages from widest to narrowest
    title:
      type: string
  required:
    - stages
---

## When to use

Use pixijs-funnel-chart for conversion/pipeline visualizations. Ideal for:
- Sales funnels
- User onboarding steps
- Any narrowing process

## Examples

```json
{
  "stages": [
    {"label": "Visitors", "value": 10000},
    {"label": "Signups", "value": 3000},
    {"label": "Active", "value": 1200},
    {"label": "Paid", "value": 400}
  ],
  "title": "Conversion Funnel"
}
```
