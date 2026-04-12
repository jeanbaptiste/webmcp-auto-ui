---
widget: pixijs-line-chart
description: Animated line chart rendered with PixiJS WebGL — smooth curves with real-time drawing animation
schema:
  type: object
  properties:
    labels:
      type: array
      items:
        type: string
      description: X-axis labels
    values:
      type: array
      items:
        type: number
      description: Data values for the line
    title:
      type: string
      description: Chart title
    color:
      type: string
      description: Line color (hex)
    lineWidth:
      type: number
      description: Line stroke width (default 2)
  required:
    - values
---

## When to use

Use pixijs-line-chart for GPU-accelerated line charts with smooth drawing animations. Ideal for:
- Animated trend visualizations
- Real-time data streams
- Presentations where visual impact matters

## How

1. Provide `values` as the data points
2. Optionally provide `labels` for the X-axis
3. Set `color` and `lineWidth` for styling

## Examples

### Simple line
```json
{
  "labels": ["Jan", "Feb", "Mar", "Apr", "May"],
  "values": [10, 25, 15, 30, 22],
  "title": "Monthly Revenue"
}
```
