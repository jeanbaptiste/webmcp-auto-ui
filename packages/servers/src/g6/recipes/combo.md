---
widget: g6-combo
description: Compound graph — nodes grouped into combo containers (clusters).
group: g6
schema:
  type: object
  required: [nodes]
  properties:
    nodes:
      type: array
      description: "Each node may have `combo: <comboId>` to assign it to a group"
    edges: { type: array }
    combos:
      type: array
      description: "Array of {id, label?} declaring the combo containers"
    spacing: { type: number, description: "Inter-combo spacing (default 20)" }
---

## When to use
Show two-level grouping: cluster a graph by team, region, type, etc.

## Example
```
g6_webmcp_widget_display({name: "g6-combo", params: {
  combos:[{id:"team-a",label:"Team A"},{id:"team-b",label:"Team B"}],
  nodes:[
    {id:"alice",combo:"team-a"},{id:"bob",combo:"team-a"},
    {id:"carol",combo:"team-b"},{id:"dan",combo:"team-b"}
  ],
  edges:[{source:"alice",target:"bob"},{source:"alice",target:"carol"},{source:"carol",target:"dan"}]
}})
```
