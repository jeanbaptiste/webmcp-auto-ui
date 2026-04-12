---
widget: stl-viewer
description: View STL-like mesh from triangles or vertex/face data. 3D printing, CAD.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    triangles:
      type: array
      description: "Array of triangles, each [[x,y,z],[x,y,z],[x,y,z]]"
      items:
        type: array
    vertices:
      type: array
      description: Alternative flat vertex array
      items:
        type: number
    faces:
      type: array
      description: Face indices (with vertices)
      items:
        type: number
    color:
      type: string
    wireframe:
      type: boolean
---

## When to use

Display 3D printable models, STL-like geometry from triangle or vertex/face data.

## How

```
widget_display('stl-viewer', {
  title: "Pyramid",
  triangles: [
    [[0,0,0],[1,0,0],[0.5,1,0]],
    [[0,0,0],[0.5,1,0],[0.5,0.5,1]],
    [[1,0,0],[0.5,1,0],[0.5,0.5,1]],
    [[0,0,0],[1,0,0],[0.5,0.5,1]]
  ],
  color: "#8899bb"
})
```
