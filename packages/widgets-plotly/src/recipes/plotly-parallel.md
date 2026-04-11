---
widget: plotly-parallel
description: Parallel coordinates plot for multivariate data. Each dimension is a vertical axis, each row a connecting line.
group: plotly
schema:
  type: object
  required:
    - dimensions
  properties:
    title:
      type: string
      description: Chart title
    dimensions:
      type: array
      description: Array of dimensions (one vertical axis each)
      items:
        type: object
        required:
          - label
          - values
        properties:
          label:
            type: string
            description: Axis label
          values:
            type: array
            description: Numeric values for this dimension
            items:
              type: number
          range:
            type: array
            description: "[min, max] range for this axis (auto-computed if omitted)"
            items:
              type: number
    colorValues:
      type: array
      description: Numeric values for line coloring (same length as dimension values)
      items:
        type: number
    colorLabel:
      type: string
      description: Label for the color scale
    colorscale:
      type: string
      description: "Plotly colorscale: 'Viridis', 'Plasma', 'Inferno', 'Jet' (default 'Viridis')"
---

## When to use

Explore relationships across many numeric dimensions simultaneously. Each data row
becomes a polyline crossing all axes. Great for parameter tuning, feature comparison,
multi-objective optimization.

## How

Call `widget_display('plotly-parallel', { dimensions: [...] })`.

Each dimension has a `label` and `values` array. All values arrays must have the same length.

Example -- car comparison:
```
widget_display('plotly-parallel', {
  title: "Car Comparison",
  dimensions: [
    { label: "Horsepower", values: [130, 165, 150, 245, 200] },
    { label: "MPG", values: [27, 24, 26, 18, 22] },
    { label: "Weight (lbs)", values: [3000, 3200, 3100, 3800, 3400] },
    { label: "0-60 (s)", values: [8.5, 7.2, 7.8, 5.5, 6.8] }
  ],
  colorValues: [27, 24, 26, 18, 22],
  colorLabel: "MPG"
})
```

## Common errors

- All dimensions must have the same number of values
- Values must be numeric (strings won't work on continuous axes)
- Too many lines (>200) makes the plot unreadable -- aggregate or sample first
