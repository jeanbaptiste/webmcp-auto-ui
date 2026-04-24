---
widget: nivo-bullet
description: Bullet charts — KPI with ranges, measures, markers.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data:
      type: array
      description: "[{id, ranges:[0,50,100], measures:[42], markers:[60]}, ...]"
    layout: { type: string, description: "'horizontal' (default) or 'vertical'" }
---

## When to use
Compact KPI visualization showing actual vs target vs ranges.

## Example
```
nivo_webmcp_widget_display({name: "nivo-bullet", params: { data: [{id:'revenue', ranges:[0,40,80,100], measures:[62], markers:[75]}] }})
```
