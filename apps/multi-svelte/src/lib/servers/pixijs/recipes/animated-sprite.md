---
widget: pixijs-animated-sprite
description: Bouncing animated shapes — demonstrates PixiJS sprite animation capabilities
schema:
  type: object
  properties:
    count:
      type: number
      description: Number of shapes (default 10)
    shapes:
      type: string
      description: Shape type — circle, square, star, mixed (default mixed)
    colors:
      type: array
      items:
        type: string
      description: Colors for shapes (hex)
    title:
      type: string
  required: []
---

## When to use

Use pixijs-animated-sprite for playful bouncing shape animations. Ideal for:
- Demo/showcase purposes
- Loading screens
- Decorative animated elements

## Examples

```json
{
  "count": 15,
  "shapes": "mixed",
  "title": "Bouncing Shapes"
}
```
