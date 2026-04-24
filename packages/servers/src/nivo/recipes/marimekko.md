---
widget: nivo-marimekko
description: Marimekko / mosaic — variable-width stacked bars.
group: nivo
schema:
  type: object
  required: [data, dimensions]
  properties:
    data: { type: array, description: "[{id, value, dimA, dimB, ...}, ...]" }
    id: { type: string, description: "Row id property (default 'id')" }
    value: { type: string, description: "Row value property for column width (default 'value')" }
    dimensions: { type: array, description: "[{id, value: 'dimKey'}, ...] — inner segmentation" }
---

## When to use
Two-level composition: column width = primary value, inner slices = secondary split.

## Example
```
nivo_webmcp_widget_display({name: "nivo-marimekko", params: { data: [{id:'A', value:100, x:20, y:80}], dimensions: [{id:'x', value:'x'},{id:'y', value:'y'}] }})
```
