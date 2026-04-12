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
widget_display('particle-system', {
  title: "Fountain",
  count: 3000,
  color: "#ff8844",
  pattern: "fountain",
  speed: 2
})
```
