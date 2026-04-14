---
widget: chartjs-radar
description: Radar chart — multivariate data displayed on radial axes from a center point
schema:
  type: object
  properties:
    labels:
      type: array
      items:
        type: string
      description: Axis labels (one per variable)
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
              type: number
          borderColor:
            type: string
          backgroundColor:
            type: string
      description: Array of dataset objects (one polygon per dataset)
    values:
      type: array
      items:
        type: number
      description: Shorthand — single dataset values
    label:
      type: string
      description: Shorthand — single dataset label
    options:
      type: object
      description: Chart.js options object
  required:
    - labels
---

## When to use

Use chartjs-radar for comparing entities across multiple dimensions. Ideal for:
- Player/product attribute comparisons
- Survey results across categories
- Skill profiles or competency matrices

## How

1. Call `chartjs_webmcp_widget_display({name: "chartjs-radar", params: {labels: ["Pace", "Shooting", "Passing", "Dribbling", "Defense", "Physical"], datasets: [{label: "Player A", data: [85, 90, 78, 88, 40, 65], borderColor: "#3b82f6"}, {label: "Player B", data: [70, 65, 92, 80, 85, 78], borderColor: "#ef4444"}]}})`

## Examples

### Player comparison
```json
{
  "labels": ["Pace", "Shooting", "Passing", "Dribbling", "Defense", "Physical"],
  "datasets": [
    {"label": "Player A", "data": [85, 90, 78, 88, 40, 65], "borderColor": "#3b82f6", "backgroundColor": "rgba(59,130,246,0.2)"},
    {"label": "Player B", "data": [70, 65, 92, 80, 85, 78], "borderColor": "#ef4444", "backgroundColor": "rgba(239,68,68,0.2)"}
  ]
}
```
