---
widget: pixijs-blur-overlay
description: Animated blur/glow overlay effect — decorative WebGL visual layer
schema:
  type: object
  properties:
    blobs:
      type: number
      description: Number of blurred blobs (default 5)
    colors:
      type: array
      items:
        type: string
      description: Blob colors (hex)
    speed:
      type: number
      description: Animation speed multiplier (default 1)
    title:
      type: string
  required: []
---

## When to use

Use pixijs-blur-overlay for decorative animated background effects. Ideal for:
- Hero section backgrounds
- Ambient visual effects
- Glassmorphism-style backgrounds

## Examples

```json
{
  "blobs": 6,
  "colors": ["#3b82f6", "#8b5cf6", "#ec4899"],
  "speed": 0.8,
  "title": "Ambient Background"
}
```
