---
widget: g6-random
description: Random scatter layout. Useful as a baseline or starting position.
group: g6
schema:
  type: object
  required: [nodes]
  properties:
    nodes: { type: array }
    edges: { type: array }
    width: { type: number }
    height: { type: number }
---

## When to use
Quick sanity check, or as a seed for an interactive layout the user will drag manually.

## Example
```
g6_webmcp_widget_display({name: "g6-random", params: {
  nodes:[{id:"a"},{id:"b"},{id:"c"}], edges:[{source:"a",target:"b"}]
}})
```
