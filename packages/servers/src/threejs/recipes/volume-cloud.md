---
widget: volume-cloud
description: Volumetric point cloud with density-based coloring. Scientific data, 3D distributions.
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
        properties:
          x:
            type: number
          y:
            type: number
          z:
            type: number
          value:
            type: number
            description: 0-1 for color mapping
    density:
      type: number
      description: Auto-generate N random points if no points given
    bounds:
      type: object
      properties:
        x:
          type: number
        y:
          type: number
        z:
          type: number
    colorLow:
      type: string
    colorHigh:
      type: string
    pointSize:
      type: number
    autoRotate:
      type: boolean
---

## When to use

Visualize volumetric data, 3D density distributions, or scientific point clouds with value mapping.

## How

```
threejs_webmcp_widget_display({name: "volume-cloud", params: {
  title: "Density Field",
  density: 2000,
  bounds: { x: 3, y: 3, z: 3 },
  colorLow: "#0044aa",
  colorHigh: "#ff4400",
  autoRotate: true
}})
```

## Example
```
threejs_webmcp_widget_display({name: "volume-cloud", params: { title: "Plasma Density", points: [{x:0,y:0,z:0,value:1.0},{x:0.5,y:0.5,z:0.3,value:0.8},{x:-0.4,y:0.2,z:0.6,value:0.6},{x:1,y:-0.3,z:0.2,value:0.4},{x:-0.8,y:0.7,z:-0.5,value:0.2}], colorLow: "#0044aa", colorHigh: "#ff2200", pointSize: 0.08, autoRotate: true }})
```
