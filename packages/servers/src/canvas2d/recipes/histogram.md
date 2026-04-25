---
widget: canvas2d-histogram
description: Histogram — frequency distribution with configurable bins
group: canvas2d
schema:
  type: object
  required: [values]
  properties:
    title: { type: string }
    values: { type: array, items: { type: number } }
    bins: { type: number, default: 20 }
    color: { type: string }
---

## When to use
Show frequency distribution of continuous data.

## How
```
widget_display({name: "canvas2d-histogram", params: {
  title: 'Age distribution',
  values: [22,25,28,30,32,35,38,40,42,45,48,50,55,60],
  bins: 8
}})
```

## Example
```
canvas2d_webmcp_widget_display({name: "canvas2d-histogram", params: {title: "Age distribution", values: [22,25,28,30,32,35,38,40,42,45,48,50,55,60], bins: 8}})
```
