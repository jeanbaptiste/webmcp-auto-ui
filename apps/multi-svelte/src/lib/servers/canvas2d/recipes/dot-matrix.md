---
widget: canvas2d-dot-matrix
description: Dot matrix — grid of colored dots for proportions
group: canvas2d
schema:
  type: object
  required: [segments]
  properties:
    title: { type: string }
    total: { type: number, default: 100 }
    cols: { type: number, default: 10 }
    segments:
      type: array
      items:
        type: object
        required: [label, count]
        properties:
          label: { type: string }
          count: { type: number }
          color: { type: string }
---

## When to use
Visual representation of proportions as discrete units (pictogram-style).

## How
```
widget_display('canvas2d-dot-matrix', {
  title: 'Survey results (100 respondents)',
  total: 100,
  segments: [
    { label: 'Agree', count: 62 },
    { label: 'Neutral', count: 23 },
    { label: 'Disagree', count: 15 }
  ]
})
```
