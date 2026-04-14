---
widget: orbit-diagram
description: Animated planetary orbit visualization. Solar systems, orbital mechanics.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    centralBody:
      type: object
      properties:
        radius:
          type: number
        color:
          type: string
    orbits:
      type: array
      items:
        type: object
        properties:
          radius:
            type: number
            description: Orbit radius
          color:
            type: string
          planetRadius:
            type: number
          speed:
            type: number
          inclination:
            type: number
            description: Orbital inclination in degrees
    animate:
      type: boolean
      description: Animate planets (default true)
---

## When to use

Display planetary orbits, satellite paths, or any orbital system.

## How

```
threejs_webmcp_widget_display({name: "orbit-diagram", params: {
  title: "Solar System",
  centralBody: { radius: 0.4, color: "#ffcc00" },
  orbits: [
    { radius: 1.5, color: "#aaaaaa", planetRadius: 0.08, speed: 2 },
    { radius: 2.5, color: "#ff8844", planetRadius: 0.12, speed: 1 },
    { radius: 4, color: "#4488ff", planetRadius: 0.15, speed: 0.5 }
  ]
}})
```
