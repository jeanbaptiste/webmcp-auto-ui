---
widget: animated-morph
description: Shape morphing animation between two geometries. Transitions, demonstrations.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    fromShape:
      type: string
      description: "Start shape: sphere, box, torus, torusKnot, cone, cylinder, icosahedron, dodecahedron"
    toShape:
      type: string
      description: End shape (same options)
    color:
      type: string
    speed:
      type: number
    scale:
      type: number
---

## When to use

Animate smooth transitions between 3D shapes for demonstrations or visual effects.

## How

```
threejs_webmcp_widget_display({name: "animated-morph", params: {
  title: "Shape Morph",
  fromShape: "sphere",
  toShape: "torusKnot",
  color: "#44aaff",
  speed: 1.5
}})
```
