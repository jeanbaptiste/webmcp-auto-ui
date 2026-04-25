---
widget: particle-system
description: Animated particle emitter with patterns. Fountains, explosions, vortexes.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    count:
      type: number
      description: Number of particles (default 2000)
    color:
      type: string
    spread:
      type: number
    speed:
      type: number
    particleSize:
      type: number
    pattern:
      type: string
      description: "Emission pattern: fountain, explosion, vortex"
---

## When to use

Create animated particle effects: fountains, explosions, swirling vortexes.

## How

```
threejs_webmcp_widget_display({name: "particle-system", params: {
  title: "Fountain",
  count: 3000,
  color: "#ff8844",
  pattern: "fountain",
  speed: 2
}})
```

## Example
```
threejs_webmcp_widget_display({name: "particle-system", params: { title: "Vortex Effect", count: 2500, color: "#44ccff", pattern: "vortex", speed: 1.5, spread: 3, particleSize: 0.03 }})
```
