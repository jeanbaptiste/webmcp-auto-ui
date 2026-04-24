---
widget: echarts-polar-bar
description: Polar bar chart — categorical bars on a circular coordinate system.
group: echarts
schema:
  type: object
  required: [categories, values]
  properties:
    title: { type: string }
    categories: { type: array, description: Angular axis category labels }
    values: { type: array, description: Numeric values, one per category }
---

## When to use
Cyclic or directional data (wind rose, hours-of-day activity) where a regular bar chart loses the cyclic feel.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-polar-bar", params: {
  categories: ["N","NE","E","SE","S","SW","W","NW"],
  values: [5, 8, 15, 12, 20, 10, 6, 3],
  title: "Wind direction"
}})
```
