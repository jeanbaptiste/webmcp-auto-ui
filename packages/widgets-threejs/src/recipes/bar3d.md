---
widget: bar3d
description: 3D bar chart with extruded bars on a labeled ground plane. Comparisons, categories, distributions.
group: threejs
schema:
  type: object
  required:
    - bars
  properties:
    title:
      type: string
    bars:
      type: array
      description: Bar data
      items:
        type: object
        required:
          - label
          - value
        properties:
          label:
            type: string
            description: Label displayed at the base of the bar
          value:
            type: number
            description: Bar height
          color:
            type: string
            description: CSS color (default auto-assigned from palette)
          row:
            type: number
            description: Row index for grouped bars (default 0)
    valueLabel:
      type: string
      description: Label for the value axis (e.g. "Revenue ($)")
    barWidth:
      type: number
      description: Width of each bar (default 0.6)
    barDepth:
      type: number
      description: Depth of each bar (default 0.6)
    palette:
      type: array
      description: Color palette for auto-coloring
      items:
        type: string
---

## When to use

Compare discrete categories in 3D: revenue by quarter, population by city,
scores by team, any dataset where bar charts apply but 3D adds visual impact.

## How

Call `widget_display('bar3d', { bars: [...] })`.

Example — quarterly revenue:
```
widget_display('bar3d', {
  title: "Revenue by Quarter",
  valueLabel: "Revenue ($M)",
  bars: [
    { label: "Q1", value: 12.5, color: "#4488ff" },
    { label: "Q2", value: 18.3, color: "#44ff88" },
    { label: "Q3", value: 15.1, color: "#ff8844" },
    { label: "Q4", value: 22.7, color: "#ff4488" }
  ]
})
```

Use `row` for grouped bars (multiple series side by side):
```
widget_display('bar3d', {
  bars: [
    { label: "Paris", value: 12, row: 0, color: "#4488ff" },
    { label: "Paris", value: 15, row: 1, color: "#ff4488" },
    { label: "London", value: 10, row: 0, color: "#4488ff" },
    { label: "London", value: 18, row: 1, color: "#ff4488" }
  ]
})
```

## Common errors

- Negative values — bars extrude downward which looks broken. Normalize to positive.
- Too many bars (>30) — the labels overlap and the scene is cluttered. Aggregate or use scatter3d.
- Forgetting valueLabel — the heights are meaningless without knowing the unit
- Bars with value 0 — they render as invisible flat planes. Filter them out or show a minimum height.
