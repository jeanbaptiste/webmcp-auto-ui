---
widget: pixijs-particle-flow
description: Animated particle system with flowing motion — mesmerizing WebGL effect
schema:
  type: object
  properties:
    count:
      type: number
      description: Number of particles (default 200)
    color:
      type: string
      description: Particle color (hex)
    speed:
      type: number
      description: Flow speed multiplier (default 1)
    title:
      type: string
    direction:
      type: string
      description: Flow direction — right, left, up, down, radial (default right)
  required: []
---

## When to use

Use pixijs-particle-flow for mesmerizing animated backgrounds or data metaphors. Ideal for:
- Visual representations of flow/throughput
- Animated backgrounds
- Data stream metaphors

## Examples

```json
{
  "count": 300,
  "color": "#3b82f6",
  "speed": 1.5,
  "direction": "radial",
  "title": "Data Flow"
}
```
