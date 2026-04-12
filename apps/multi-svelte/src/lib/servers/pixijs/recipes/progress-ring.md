---
widget: pixijs-progress-ring
description: Animated circular progress ring with percentage display
schema:
  type: object
  properties:
    value:
      type: number
      description: Progress value (0–100)
    color:
      type: string
      description: Ring fill color (hex)
    trackColor:
      type: string
      description: Background track color (hex)
    title:
      type: string
    label:
      type: string
      description: Label below the percentage
    size:
      type: number
      description: Ring diameter in pixels (default 200)
  required:
    - value
---

## When to use

Use pixijs-progress-ring for animated circular progress indicators. Ideal for:
- Goal completion
- Upload/download progress
- Score displays

## How
1. Call `pixijs_webmcp_widget_display({name: "progress-ring", params: {value: 73, color: "#10b981", title: "Progress"}})`

## Examples

```json
{
  "value": 73,
  "color": "#10b981",
  "title": "Project Progress",
  "label": "Complete"
}
```
