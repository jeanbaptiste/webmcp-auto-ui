---
widget: mesh-viewer
description: Display 3D mesh from vertices and faces arrays. CAD, 3D models.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    vertices:
      type: array
      description: Flat array of vertex positions [x,y,z,x,y,z,...]
      items:
        type: number
    faces:
      type: array
      description: Triangle indices [i0,i1,i2,...]
      items:
        type: number
    color:
      type: string
    wireframe:
      type: boolean
    flatShading:
      type: boolean
    autoCenter:
      type: boolean
---

## When to use

Display arbitrary 3D meshes from vertex/face data. CAD models, generated geometry.

## How

```
widget_display('mesh-viewer', {
  title: "Tetrahedron",
  vertices: [0,1,0, -1,-1,1, 1,-1,1, 0,-1,-1],
  faces: [0,1,2, 0,2,3, 0,3,1, 1,3,2],
  color: "#6688cc",
  wireframe: true
})
```
