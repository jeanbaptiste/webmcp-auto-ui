---
widget: recharts-treemap
description: Treemap — nested rectangles sized by a numeric value. Part-to-whole with many parts.
group: recharts
schema:
  type: object
  required: [rows]
  properties:
    rows:
      type: array
      description: "[{name:'A', size:40, children?:[{name, size}]}]"
    dataKey: { type: string, description: "default 'size'" }
    nameKey: { type: string, description: "default 'name'" }
---

## When to use
Many parts summing to a whole; highlight relative size rather than precise value.

## Example
```
recharts_webmcp_widget_display({name: "recharts-treemap", params: {
  rows: [
    {name:'A',size:40},{name:'B',size:25},{name:'C',size:15},{name:'D',size:10}
  ]
}})
```
