---
widget: plotly-box
description: Box plot for comparing distributions across categories. Quartiles, outliers, medians.
group: plotly
schema:
  type: object
  required:
    - series
  properties:
    title:
      type: string
      description: Chart title
    series:
      type: array
      description: One or more named data series
      items:
        type: object
        required:
          - label
          - values
        properties:
          label:
            type: string
            description: Series name
          values:
            type: array
            description: Numeric values for this series
            items:
              type: number
          color:
            type: string
            description: Box color (CSS color)
    horizontal:
      type: boolean
      description: Horizontal layout (default false, vertical)
    showPoints:
      type: string
      description: "Show individual points: 'all', 'outliers', 'suspectedoutliers', false (default 'outliers')"
    xLabel:
      type: string
      description: X-axis label
    yLabel:
      type: string
      description: Y-axis label
---

## When to use

Compare distributions across categories. Shows median, quartiles, and outliers.
Use for A/B test results, comparing groups, statistical summaries.

## How

Call `widget_display('plotly-box', { series: [...] })`.

Each series has a `label` and `values` array.

Example -- response times by server:
```
widget_display('plotly-box', {
  title: "API Response Times",
  series: [
    { label: "Server A", values: [120, 135, 128, 145, 110, 200, 130] },
    { label: "Server B", values: [95, 102, 98, 115, 88, 105, 92] },
    { label: "Server C", values: [150, 180, 165, 210, 145, 170, 195] }
  ],
  yLabel: "ms"
})
```

## Common errors

- series must be an array of objects, not a flat array of numbers
- Each series needs both label and values
- Set horizontal: true for better readability with long labels
