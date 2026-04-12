---
widget: chartjs-polar-area
description: Polar area chart — radial segments where angle is equal but radius encodes value
schema:
  type: object
  properties:
    labels:
      type: array
      items:
        type: string
      description: Label for each segment
    datasets:
      type: array
      items:
        type: object
        properties:
          data:
            type: array
            items:
              type: number
          backgroundColor:
            type: array
            items:
              type: string
      description: Dataset with values and optional colors
    values:
      type: array
      items:
        type: number
      description: Shorthand — segment values
    label:
      type: string
      description: Dataset label
    options:
      type: object
      description: Chart.js options object
  required:
    - labels
---

## When to use

Use chartjs-polar-area when you want to compare magnitudes across categories on a radial axis. Unlike pie/doughnut, the angle of each slice is equal — only the radius varies. Ideal for:
- Comparing scores across equal categories (skills, criteria)
- Showing relative magnitudes without implying "part of a whole"

## How

1. Provide `labels` for each radial segment
2. Provide `values` or `datasets`
3. Each segment extends from center; radius is proportional to value

## Examples

### Skill assessment
```json
{
  "labels": ["Speed", "Strength", "Agility", "Endurance", "Flexibility"],
  "values": [8, 6, 9, 7, 5]
}
```
