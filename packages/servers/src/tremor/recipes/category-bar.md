---
widget: tremor-category-bar
description: Segmented bar with threshold marker (Tremor).
group: tremor
schema:
  type: object
  required: [values]
  properties:
    values: { type: array, description: Segment widths summing to 100 }
    colors: { type: array }
    markerValue: { type: number, description: Position of marker 0-100 }
    label: { type: string }
    showLabels: { type: boolean }
---

## When to use
Score ranges (bad / ok / good) with a current-value marker.

## Example
```
tremor_webmcp_widget_display({name: "tremor-category-bar", params: {
  values:[40,30,20,10], colors:['rose','amber','emerald','blue'], markerValue:62, label:'NPS'
}})
```
