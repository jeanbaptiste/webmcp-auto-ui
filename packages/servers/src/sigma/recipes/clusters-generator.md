---
widget: sigma-graphology-clusters-generator
description: Generates a synthetic clustered graph and colors nodes by cluster. Useful for demoing community structure.
group: sigma
schema:
  type: object
  properties:
    order: { type: number, description: "Number of nodes (default 80)" }
    size: { type: number, description: "Number of edges (default 200)" }
    clusters: { type: number, description: "Number of clusters (default 4)" }
    clusterDensity: { type: number, description: "Probability an edge is intra-cluster ∈ [0,1] (default 0.7)" }
---

## When to use
Demo cluster-detection visuals, generate realistic synthetic networks for testing.

## Example
```
sigma_webmcp_widget_display({name: "sigma-graphology-clusters-generator", params: {
  order: 120, size: 300, clusters: 5, clusterDensity: 0.8
}})
```
