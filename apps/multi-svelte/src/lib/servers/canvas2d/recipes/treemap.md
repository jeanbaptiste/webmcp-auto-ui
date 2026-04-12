---
widget: canvas2d-treemap
description: Treemap — nested rectangles for hierarchical data
group: canvas2d
schema:
  type: object
  required: [root]
  properties:
    title: { type: string }
    root:
      type: object
      required: [name]
      properties:
        name: { type: string }
        value: { type: number }
        children: { type: array }
---

## When to use
Show hierarchical part-to-whole with space-efficient nested rectangles.

## How
```
widget_display({name: "canvas2d-treemap", params: {
  title: 'Disk usage',
  root: {
    name: 'root',
    children: [
      { name: 'src', value: 400 },
      { name: 'node_modules', value: 800 },
      { name: 'assets', value: 200 }
    ]
  }
}})
```
