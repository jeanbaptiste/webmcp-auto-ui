---
widget: plotly-image
description: Display image data as a plot (RGB/RGBA pixel arrays).
group: plotly
schema:
  type: object
  required: [z]
  properties:
    title: { type: string, description: Chart title }
    z: { type: array, description: "3D array [rows][cols][channels] of pixel values" }
    colormodel: { type: string, description: "'rgb' (default), 'rgba', 'hsl', 'hsla'" }
---

## When to use
Display raw image data (pixel arrays) directly in a plot.

## Example
```
plotly_webmcp_widget_display({name: "plotly-image", params: { z: [[[255,0,0],[0,255,0]],[[0,0,255],[255,255,0]]] }})
```
