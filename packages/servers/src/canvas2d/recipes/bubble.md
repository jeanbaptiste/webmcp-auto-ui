---
widget: canvas2d-bubble
description: Bubble chart — scatter with variable radius
group: canvas2d
schema:
  type: object
  required: [points]
  properties:
    title: { type: string }
    points:
      type: array
      items:
        type: object
        required: [x, y, r]
        properties:
          x: { type: number }
          y: { type: number }
          r: { type: number, description: "Bubble size" }
          label: { type: string }
          category: { type: string }
---

## When to use
Three-dimensional data visualization (x, y, size).

## How
```
widget_display({name: "canvas2d-bubble", params: {
  title: 'GDP vs Life expectancy',
  points: [
    { x: 45000, y: 78, r: 330, category: 'US' },
    { x: 12000, y: 75, r: 1400, category: 'China' }
  ]
}})
```

## Example
```
canvas2d_webmcp_widget_display({name: "canvas2d-bubble", params: {title: "GDP vs Life expectancy", points: [{x: 45000, y: 78, r: 330, category: "US"}, {x: 12000, y: 75, r: 1400, category: "China"}, {x: 8000, y: 72, r: 200, category: "Brazil"}]}})
```
