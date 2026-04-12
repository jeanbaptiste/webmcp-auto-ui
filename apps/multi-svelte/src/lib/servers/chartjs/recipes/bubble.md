---
widget: chartjs-bubble
description: Bubble chart — scatter plot where a third dimension is encoded as point radius
schema:
  type: object
  properties:
    labels:
      type: array
      items:
        type: string
      description: Optional legend labels (one per dataset)
    datasets:
      type: array
      items:
        type: object
        properties:
          label:
            type: string
          data:
            type: array
            items:
              type: object
              properties:
                x:
                  type: number
                y:
                  type: number
                r:
                  type: number
          backgroundColor:
            type: string
      description: Array of datasets with {x, y, r} point arrays
    points:
      type: array
      items:
        type: object
        properties:
          x:
            type: number
          y:
            type: number
          r:
            type: number
      description: Shorthand — single dataset of {x, y, r} points
    label:
      type: string
      description: Shorthand — single dataset label
    options:
      type: object
      description: Chart.js options object
  required: []
---

## When to use

Use chartjs-bubble for three-dimensional comparisons where the third variable is magnitude/size. Ideal for:
- Country comparisons (GDP vs life expectancy, population as bubble size)
- Product analysis (price vs rating, sales volume as size)
- Any x/y/magnitude dataset

## How

1. Provide `datasets` with arrays of `{x, y, r}` objects (r = bubble radius in pixels)
2. Or use `points` shorthand for a single dataset
3. Radius is in pixels — normalize your data to a reasonable range (2-30)

## Examples

### Country comparison
```json
{
  "datasets": [
    {
      "label": "Countries",
      "data": [
        {"x": 45000, "y": 82, "r": 15},
        {"x": 12000, "y": 74, "r": 25},
        {"x": 35000, "y": 80, "r": 8},
        {"x": 8000, "y": 68, "r": 20}
      ],
      "backgroundColor": "rgba(59,130,246,0.5)"
    }
  ],
  "options": {
    "scales": {
      "x": {"title": {"display": true, "text": "GDP per capita ($)"}},
      "y": {"title": {"display": true, "text": "Life expectancy (years)"}}
    }
  }
}
```
