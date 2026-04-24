---
widget: recharts-radar
description: Radar (spider) chart — multiple numeric axes sharing a common scale. Compare profiles.
group: recharts
schema:
  type: object
  required: [rows, series]
  properties:
    rows: { type: array, description: "[{subject:'Strength', A:120, B:110}]" }
    angleKey: { type: string, description: "default 'subject'" }
    series:
      type: array
      description: "[{dataKey:'A', name?, color?}]"
---

## When to use
Compare the profile of 1-3 entities across 4-8 dimensions on the same scale.

## Example
```
recharts_webmcp_widget_display({name: "recharts-radar", params: {
  rows: [
    {subject:'Speed',A:120,B:110},
    {subject:'Power',A:98,B:130},
    {subject:'Range',A:86,B:130}
  ],
  series: [{dataKey:'A'},{dataKey:'B'}]
}})
```
