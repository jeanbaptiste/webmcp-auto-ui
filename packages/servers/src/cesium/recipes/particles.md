---
widget: cesium-particles
description: Particle system anchored to a geographic position (smoke, fire, plume).
group: cesium
schema:
  type: object
  properties:
    longitude: { type: number }
    latitude: { type: number }
    height: { type: number, description: Anchor altitude (default 1000) }
    image: { type: string, description: URL of particle texture }
    startColor: { type: string }
    endColor: { type: string }
    emissionRate: { type: number, description: Particles/sec (default 50) }
    minSpeed: { type: number }
    maxSpeed: { type: number }
    minLife: { type: number }
    maxLife: { type: number }
    emitterRadius: { type: number, description: Circle emitter radius (default 50) }
---

## When to use
Volcanic plume, factory smokestack, wildfire, geyser.

## Example
```
cesium_webmcp_widget_display({name: "cesium-particles", params: { longitude: 14.42, latitude: 40.82, height: 1280, emissionRate: 80 }})
```
