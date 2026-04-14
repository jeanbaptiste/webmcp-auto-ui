---
widget: wireframe-viewer
description: Display geometry as wireframe. Shapes, topology inspection.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    shape:
      type: string
      description: "Predefined shape: sphere, box, torus, torusKnot, cylinder, cone, icosahedron, dodecahedron"
    color:
      type: string
    scale:
      type: number
    segments:
      type: number
    autoRotate:
      type: boolean
    vertices:
      type: array
      description: Custom vertices (flat array)
      items:
        type: number
    faces:
      type: array
      description: Custom face indices
      items:
        type: number
---

## When to use

Inspect geometry topology, display wireframe shapes, or show custom meshes as wireframes.

## How

```
threejs_webmcp_widget_display({name: "wireframe-viewer", params: {
  title: "Torus Knot",
  shape: "torusKnot",
  color: "#44aaff",
  scale: 1.5,
  autoRotate: true
}})
```
