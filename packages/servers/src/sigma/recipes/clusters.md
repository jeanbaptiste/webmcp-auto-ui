---
widget: sigma-clusters
description: Graph with nodes colored by `cluster` attribute. Pair with ForceAtlas2 to visually surface communities.
group: sigma
schema:
  type: object
  required: [nodes]
  properties:
    nodes:
      type: array
      description: "Nodes [{id, cluster, label?, size?}] — cluster can be string or number"
    edges:
      type: array
      description: "Edges [{source, target, weight?}]"
---

## When to use
Display known cluster/community membership. Each distinct cluster id gets a distinct color from a 10-color palette.

## Example
```
sigma_webmcp_widget_display({name: "sigma-clusters", params: {
  nodes: [
    {id: "a", cluster: 0}, {id: "b", cluster: 0},
    {id: "c", cluster: 1}, {id: "d", cluster: 1},
    {id: "e", cluster: 2}
  ],
  edges: [
    {source: "a", target: "b"}, {source: "c", target: "d"},
    {source: "a", target: "c"}, {source: "d", target: "e"}
  ]
}})
```
