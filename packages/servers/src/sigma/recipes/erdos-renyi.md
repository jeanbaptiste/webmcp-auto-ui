---
widget: sigma-graphology-erdos-renyi
description: Generates an Erdős-Rényi random graph G(n, p) and renders it with ForceAtlas2.
group: sigma
schema:
  type: object
  properties:
    order: { type: number, description: "Number of nodes (default 50)" }
    probability: { type: number, description: "Edge probability p ∈ [0,1] (default 0.05)" }
---

## When to use
Demos, sanity checks, or to visualize the structure of a random graph as a baseline.

## Example
```
sigma_webmcp_widget_display({name: "sigma-graphology-erdos-renyi", params: { order: 80, probability: 0.04 }})
```
