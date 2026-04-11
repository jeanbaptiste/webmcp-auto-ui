---
widget: plotly-violin
description: Violin plot showing full distribution shape per category. Like box plot but with kernel density estimation.
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
            description: Fill color (CSS color)
    horizontal:
      type: boolean
      description: Horizontal layout (default false, vertical)
    showBox:
      type: boolean
      description: Show box plot inside the violin (default true)
    showMeanline:
      type: boolean
      description: Show mean line inside the violin (default false)
    xLabel:
      type: string
      description: X-axis label
    yLabel:
      type: string
      description: Y-axis label
---

## When to use

Like a box plot, but shows the full shape of the distribution (bimodal, skewed, etc.).
Best when you need to compare distribution shapes, not just quartiles.

## How

Call `widget_display('plotly-violin', { series: [...] })`.

Same data format as box plot: each series has a `label` and `values` array.

Example -- salary distributions:
```
widget_display('plotly-violin', {
  title: "Salary Distribution by Department",
  series: [
    { label: "Engineering", values: [85, 92, 78, 105, 95, 88, 110, 72, 98] },
    { label: "Marketing", values: [55, 62, 58, 70, 65, 60, 75, 52, 68] },
    { label: "Sales", values: [45, 80, 55, 120, 65, 90, 50, 110, 70] }
  ],
  yLabel: "Salary (k$)",
  showBox: true,
  showMeanline: true
})
```

## Common errors

- Same as box plot: series must be an array of { label, values } objects
- Violin plots need enough data points (>5) to show meaningful distribution shapes
- Small datasets look better as box plots
