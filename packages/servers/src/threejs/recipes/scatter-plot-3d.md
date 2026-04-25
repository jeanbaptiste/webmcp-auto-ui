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

## Example
```
threejs_webmcp_widget_display({name: "scatter-plot-3d", params: { title: "Iris Dataset Sample", points: [{x:5.1,y:3.5,z:1.4,color:"#ff4444"},{x:7.0,y:3.2,z:4.7,color:"#4488ff"},{x:6.3,y:3.3,z:6.0,color:"#44cc88"},{x:4.9,y:3.0,z:1.4,color:"#ff4444"},{x:6.4,y:3.2,z:4.5,color:"#4488ff"}], axes: {x:"Sepal L",y:"Sepal W",z:"Petal L"} }})
```
