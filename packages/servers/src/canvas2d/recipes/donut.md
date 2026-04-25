---
widget: canvas2d-donut
description: Donut chart — pie with hollow center for label
group: canvas2d
schema:
  type: object
  required: [slices]
  properties:
    title: { type: string }
    slices:
      type: array
      items:
        type: object
        required: [label, value]
        properties:
          label: { type: string }
          value: { type: number }
    centerLabel: { type: string, description: "Text displayed in the center" }
---

## When to use
Part-to-whole with a central KPI or label.

## How
```
widget_display({name: "canvas2d-donut", params: {
  title: 'Budget allocation',
  centerLabel: '$1.2M',
  slices: [
    { label: 'Engineering', value: 500 },
    { label: 'Marketing', value: 300 },
    { label: 'Operations', value: 400 }
  ]
}})
```

## Example
```
canvas2d_webmcp_widget_display({name: "canvas2d-donut", params: {title: "Budget allocation", centerLabel: "$1.2M", slices: [{label: "Engineering", value: 500}, {label: "Marketing", value: 300}, {label: "Operations", value: 400}]}})
```
