---
widget: plotly-histogram
description: Histogram from raw values. Plotly computes bins automatically. Distributions, frequency analysis.
group: plotly
schema:
  type: object
  required:
    - values
  properties:
    title:
      type: string
      description: Chart title
    values:
      type: array
      description: Raw numeric values (Plotly computes bins)
      items:
        type: number
    nbins:
      type: number
      description: Number of bins (optional, Plotly auto-calculates if omitted)
    color:
      type: string
      description: Bar color (CSS color, default '#636efa')
    xLabel:
      type: string
      description: X-axis label
    yLabel:
      type: string
      description: Y-axis label (default 'Count')
    cumulative:
      type: boolean
      description: Show cumulative distribution (default false)
    histnorm:
      type: string
      description: "Normalization: 'percent', 'probability', 'density', 'probability density' (default none)"
---

## When to use

Display the distribution of a dataset. Pass raw values -- Plotly computes the bins.
Useful for score distributions, measurement frequencies, statistical analysis.

## How

Call `widget_display('plotly-histogram', { values: [...] })`.

Example -- exam scores:
```
widget_display('plotly-histogram', {
  title: "Exam Score Distribution",
  values: [72, 85, 90, 68, 75, 82, 91, 78, 65, 88, 79, 84, 70, 95, 67],
  xLabel: "Score",
  yLabel: "Frequency",
  nbins: 10
})
```

## Common errors

- Pass raw values, not pre-computed bin counts
- values must be numbers, not strings
- nbins is optional -- Plotly's auto-binning is usually good enough
