---
widget: scatter3d
description: 3D scatter plot with colored/sized points and labeled axes. Data exploration, clustering, PCA.
group: threejs
schema:
  type: object
  required:
    - points
  properties:
    title:
      type: string
    points:
      type: array
      description: Data points in 3D space
      items:
        type: object
        required:
          - x
          - y
          - z
        properties:
          x:
            type: number
          y:
            type: number
          z:
            type: number
          color:
            type: string
            description: CSS color (default #4488ff)
          size:
            type: number
            description: Point size (default 0.05)
          label:
            type: string
    axes:
      type: object
      properties:
        x:
          type: string
          description: X axis label
        y:
          type: string
          description: Y axis label
        z:
          type: string
          description: Z axis label
    gridColor:
      type: string
      description: Grid line color (default #333333)
---

## When to use

Visualize multidimensional data in 3D space: PCA results, clustering output,
scientific measurements with 3 variables, spatial coordinates.

## How

Call `widget_display('scatter3d', { points: [...], axes: {...} })`.

Example — PCA visualization:
```
widget_display('scatter3d', {
  title: "PCA — 3 Components",
  points: [
    { x: 1.2, y: 0.5, z: -0.3, color: "#ff4444", label: "A" },
    { x: -0.8, y: 1.1, z: 0.7, color: "#44ff44", label: "B" },
    { x: 0.3, y: -1.2, z: 1.5, color: "#4444ff", label: "C" }
  ],
  axes: { x: "PC1", y: "PC2", z: "PC3" }
})
```

## Common errors

- Not normalizing data — if X ranges 0..1000 and Y ranges 0..1, the plot is flat along Y. Normalize first.
- Too many points (>2000) — use instanced rendering or aggregate
- Forgetting axis labels — the 3D space is meaningless without knowing what X, Y, Z represent
- Using identical colors for all points — defeats the purpose of 3D scatter
