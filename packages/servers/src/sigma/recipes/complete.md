---
widget: sigma-graphology-complete
description: Generates a complete graph K_n (every pair of nodes connected) and renders on a circle.
group: sigma
schema:
  type: object
  properties:
    order: { type: number, description: "Number of nodes n (default 8). All n(n-1)/2 edges drawn." }
---

## When to use
Show maximally connected structures, demonstrate edge density, illustrate combinatorial limits.

## Example
```
sigma_webmcp_widget_display({name: "sigma-graphology-complete", params: { order: 10 }})
```
