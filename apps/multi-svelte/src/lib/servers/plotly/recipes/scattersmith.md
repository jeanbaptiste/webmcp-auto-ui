---
widget: plotly-scattersmith
description: Smith chart — RF/microwave impedance visualization.
group: plotly
schema:
  type: object
  required: [real, imag]
  properties:
    title: { type: string, description: Chart title }
    real: { type: array, items: { type: number }, description: Real part of impedance }
    imag: { type: array, items: { type: number }, description: Imaginary part of impedance }
    mode: { type: string, description: "'markers' (default)" }
    text: { type: array, items: { type: string }, description: Hover text }
    markerSize: { type: number, description: Marker size (default 8) }
---

## When to use
RF engineering — plot impedance/admittance on a Smith chart.

## Example
```
plotly_webmcp_widget_display({name: "plotly-scattersmith", params: { real: [0.5, 1.0, 1.5], imag: [0.2, -0.3, 0.5] }})
```
