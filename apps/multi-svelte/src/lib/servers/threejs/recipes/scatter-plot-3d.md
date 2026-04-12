---
widget: scatter-plot-3d
description: 3D scatter plot with labeled axes. Multivariate data exploration.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    points:
      type: array
      items:
        type: object
        required: [x, y, z]
        properties:
          x:
            type: number
          y:
            type: number
          z:
            type: number
          color:
            type: string
          size:
            type: number
    axes:
      type: object
      properties:
        x:
          type: string
        y:
          type: string
        z:
          type: string
    gridColor:
      type: string
---

## When to use

Explore 3-dimensional data relationships. Each point has x, y, z coordinates.

## How

```
threejs_webmcp_widget_display({name: "scatter-plot-3d", params: {
  title: "3D Data",
  points: [
    { x: 1, y: 2, z: 3, color: "#ff4444" },
    { x: 4, y: 1, z: 2, color: "#4444ff" },
    { x: 2, y: 5, z: 1 }
  ],
  axes: { x: "Width", y: "Height", z: "Depth" }
}})
```
