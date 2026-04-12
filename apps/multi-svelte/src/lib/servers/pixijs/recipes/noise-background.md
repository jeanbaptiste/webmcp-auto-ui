---
widget: pixijs-noise-background
description: Animated Perlin-like noise background — organic flowing patterns with WebGL
schema:
  type: object
  properties:
    color1:
      type: string
      description: Primary color (hex)
    color2:
      type: string
      description: Secondary color (hex)
    speed:
      type: number
      description: Animation speed (default 1)
    scale:
      type: number
      description: Noise scale — larger = smoother (default 4)
    title:
      type: string
  required: []
---

## When to use

Use pixijs-noise-background for organic animated backgrounds. Ideal for:
- Ambient visual backgrounds
- Generative art displays
- Loading screen aesthetics

## Examples

```json
{
  "color1": "#1e1b4b",
  "color2": "#7c3aed",
  "speed": 0.5,
  "scale": 6,
  "title": "Noise Field"
}
```
