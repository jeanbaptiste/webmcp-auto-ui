---
widget: pixijs-render-snapshot
description: Static snapshot renderer — renders shapes and text from a declarative scene description
schema:
  type: object
  properties:
    elements:
      type: array
      items:
        type: object
        properties:
          type:
            type: string
            description: Shape type — rect, circle, text, line
          x:
            type: number
          y:
            type: number
          width:
            type: number
          height:
            type: number
          radius:
            type: number
          color:
            type: string
          text:
            type: string
          fontSize:
            type: number
          x2:
            type: number
          y2:
            type: number
      description: Scene elements to render
    title:
      type: string
    background:
      type: string
      description: Background color (hex)
  required:
    - elements
---

## When to use

Use pixijs-render-snapshot for declarative scene rendering. Ideal for:
- Diagrams and layouts
- Wireframes
- Custom infographics

## How
1. Call `pixijs_webmcp_widget_display({name: "render-snapshot", params: {elements: [{type: "rect", x: 50, y: 50, width: 200, height: 100, color: "#3b82f6"}]}})`

## Examples

```json
{
  "elements": [
    {"type": "rect", "x": 50, "y": 50, "width": 200, "height": 100, "color": "#3b82f6"},
    {"type": "circle", "x": 350, "y": 100, "radius": 40, "color": "#ef4444"},
    {"type": "text", "x": 100, "y": 200, "text": "Hello PixiJS", "fontSize": 20, "color": "#ffffff"}
  ],
  "title": "Scene Snapshot"
}
```
