---
widget: g6-mindmap
description: Mind map — central topic with branches radiating left/right.
group: g6
schema:
  type: object
  properties:
    root: { type: object, description: "{label, children: [...]}" }
    nodes: { type: array }
    edges: { type: array }
    direction: { type: string, description: "'H' (horizontal both sides, default) | 'V' | 'LR' | 'RL'" }
    hGap: { type: number, description: "Horizontal sibling gap (default 60)" }
    vGap: { type: number, description: "Vertical sibling gap (default 20)" }
---

## When to use
Brainstorming, topic decomposition — when emphasis is on the central concept.

## Example
```
g6_webmcp_widget_display({name: "g6-mindmap", params: {
  root: {label:"Project", children:[
    {label:"Frontend", children:[{label:"UI"},{label:"State"}]},
    {label:"Backend", children:[{label:"API"},{label:"DB"}]}
  ]}
}})
```
