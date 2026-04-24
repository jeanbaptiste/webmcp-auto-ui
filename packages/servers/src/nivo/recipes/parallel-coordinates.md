---
widget: nivo-parallel-coordinates
description: Parallel coordinates — multidimensional data with parallel axes.
group: nivo
schema:
  type: object
  required: [data, variables]
  properties:
    data: { type: array, description: "[{key1: val, key2: val, ...}, ...]" }
    variables:
      type: array
      description: "Variables config [{id, label, value, min, max, ticksPosition?}, ...]"
---

## When to use
Compare items across many quantitative dimensions.

## Example
```
nivo_webmcp_widget_display({name: "nivo-parallel-coordinates", params: { data: [{a:1,b:5,c:9}], variables: [{id:'a', value:'a', label:'A', min:0, max:10}, {id:'b', value:'b', label:'B', min:0, max:10}, {id:'c', value:'c', label:'C', min:0, max:10}] }})
```
