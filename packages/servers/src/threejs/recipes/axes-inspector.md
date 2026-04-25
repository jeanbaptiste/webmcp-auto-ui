---
widget: axes-inspector
description: Interactive XYZ axes with grid, labels, and optional objects. Coordinate system viewer.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    range:
      type: number
      description: Axis range (default 5)
    gridDivisions:
      type: number
    showLabels:
      type: boolean
    xLabel:
      type: string
    yLabel:
      type: string
    zLabel:
      type: string
    objects:
      type: array
      description: Optional objects to place in scene
      items:
        type: object
        properties:
          x:
            type: number
          y:
            type: number
          z:
            type: number
          size:
            type: number
          color:
            type: string
---

## When to use

Display a coordinate system with labeled axes, grid, and optional reference objects.

## How

```
threejs_webmcp_widget_display({name: "axes-inspector", params: {
  title: "3D Space",
  range: 5,
  xLabel: "X", yLabel: "Y", zLabel: "Z",
  objects: [
    { x: 2, y: 3, z: 1, color: "#ff0000", size: 0.2 },
    { x: -1, y: 1, z: 4, color: "#00ff00" }
  ]
}})
```

## Example
```
threejs_webmcp_widget_display({name: "axes-inspector", params: { title: "Coordinate Frame", range: 4, xLabel: "X", yLabel: "Y", zLabel: "Z", showLabels: true, objects: [{x:1,y:2,z:1,color:"#ff4444",size:0.3},{x:-2,y:1,z:3,color:"#44ff88",size:0.2}] }})
```
