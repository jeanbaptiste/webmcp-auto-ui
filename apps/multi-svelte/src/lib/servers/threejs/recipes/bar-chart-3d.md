---
widget: bar-chart-3d
description: 3D bar chart with labeled ground plane. Categorical comparisons in 3D.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    bars:
      type: array
      description: Bar data
      items:
        type: object
        required: [label, value]
        properties:
          label:
            type: string
          value:
            type: number
          color:
            type: string
          row:
            type: number
            description: Z-axis row (default 0)
    barWidth:
      type: number
      description: Bar width (default 0.6)
    barDepth:
      type: number
      description: Bar depth (default 0.6)
    palette:
      type: array
      items:
        type: string
---

## When to use

Compare categorical values in 3D. Multi-row bars for grouped comparisons.

## How

```
widget_display('bar-chart-3d', {
  title: "Sales by Region",
  bars: [
    { label: "US", value: 120, color: "#4488ff" },
    { label: "EU", value: 95, color: "#44cc88" },
    { label: "Asia", value: 150, color: "#ff8844" }
  ]
})
```
