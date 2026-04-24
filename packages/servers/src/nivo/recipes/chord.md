---
widget: nivo-chord
description: Chord diagram — weighted links between a set of entities.
group: nivo
schema:
  type: object
  required: [keys, data]
  properties:
    keys: { type: array, description: "Entity labels, e.g. ['A','B','C']" }
    data: { type: array, description: "Square matrix of flows: [[0,5,3],[2,0,8],[4,1,0]]" }
---

## When to use
Show bidirectional relationships between a small set of entities.

## Example
```
nivo_webmcp_widget_display({name: "nivo-chord", params: { keys: ['A','B','C'], data: [[0,5,3],[2,0,8],[4,1,0]] }})
```
