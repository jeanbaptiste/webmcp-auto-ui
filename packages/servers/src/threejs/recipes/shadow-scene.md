---
widget: shadow-scene
description: Scene with realistic shadows from directional light. Object composition.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    objects:
      type: array
      items:
        type: object
        properties:
          shape:
            type: string
            description: "sphere, box, cone, cylinder, torus"
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
    groundColor:
      type: string
    lightColor:
      type: string
---

## When to use

Display 3D objects with realistic shadows on a ground plane. Scene composition.

## How

```
threejs_webmcp_widget_display({name: "shadow-scene", params: {
  title: "Shadow Demo",
  objects: [
    { shape: "sphere", x: 0, y: 1, z: 0, color: "#4488ff", size: 1 },
    { shape: "box", x: 2, y: 0.5, z: 1, color: "#ff4488", size: 1 }
  ]
}})
```

## Example
```
threejs_webmcp_widget_display({name: "shadow-scene", params: { title: "Object Composition", objects: [{shape:"sphere",x:0,y:1,z:0,color:"#4488ff",size:1},{shape:"box",x:2.5,y:0.5,z:0,color:"#ff4488",size:1},{shape:"cone",x:-2,y:0.8,z:1,color:"#44cc88",size:0.8},{shape:"torus",x:0,y:2.5,z:-1,color:"#ffaa22",size:0.7}], groundColor: "#cccccc", lightColor: "#ffffff" }})
```
