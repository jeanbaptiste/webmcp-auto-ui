---
widget: chartjs-scatter
description: Scatter plot — display individual data points by x/y coordinates
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
          backgroundColor:
            type: string
      description: Array of datasets with {x, y} point arrays
    points:
      type: array
      items:
        type: object
        properties:
          x:
            type: number
          y:
            type: number
      description: Shorthand — single dataset of {x, y} points
    label:
      type: string
      description: Shorthand — single dataset label
    options:
      type: object
      description: Chart.js options object
  required: []
---

## When to use

Use chartjs-scatter for visualizing relationships between two numeric variables. Ideal for:
- Correlation analysis (height vs weight, price vs sales)
- Clustering patterns
- Outlier detection

## How

1. Call `chartjs_webmcp_widget_display({name: "chartjs-scatter", params: {datasets: [{label: "Students", data: [{x: 2, y: 55}, {x: 4, y: 70}, {x: 6, y: 78}, {x: 8, y: 85}], backgroundColor: "#8b5cf6"}]}})`

## Examples

### Correlation
```json
{
  "datasets": [
    {
      "label": "Students",
      "data": [
        {"x": 2, "y": 55}, {"x": 4, "y": 70}, {"x": 6, "y": 78},
        {"x": 8, "y": 85}, {"x": 3, "y": 60}, {"x": 7, "y": 82}
      ],
      "backgroundColor": "#8b5cf6"
    }
  ],
  "options": {
    "scales": {
      "x": {"title": {"display": true, "text": "Hours studied"}},
      "y": {"title": {"display": true, "text": "Score"}}
    }
  }
}
```
