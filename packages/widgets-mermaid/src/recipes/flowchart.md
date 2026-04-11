---
widget: flowchart
description: Flowchart / directed graph diagram (Mermaid.js)
group: mermaid
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid flowchart syntax (graph TD/LR/BT/RL)"
    nodes:
      type: array
      description: "Structured nodes [{id, label, shape?}] — alternative to definition"
      items:
        type: object
        properties:
          id:
            type: string
          label:
            type: string
          shape:
            type: string
            description: "rect (default), round, stadium, diamond, circle, hexagon"
    edges:
      type: array
      description: "Structured edges [{from, to, label?}] — used with nodes"
      items:
        type: object
        properties:
          from:
            type: string
          to:
            type: string
          label:
            type: string
    direction:
      type: string
      description: "Graph direction: TD (default), LR, BT, RL"
---

## When to use
For process flows, decision trees, state machines, or any directed graph. Use when the user asks for a diagram showing connections between steps, nodes, or states.

## How
Provide either raw Mermaid syntax via `definition`, or structured data via `nodes` + `edges`:

**Raw syntax:**
```
widget_display('flowchart', { definition: "graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Do X]\n  B -->|No| D[Do Y]\n  C --> E[End]\n  D --> E" })
```

**Structured data:**
```
widget_display('flowchart', {
  direction: "LR",
  nodes: [
    { id: "A", label: "Start" },
    { id: "B", label: "Decision", shape: "diamond" },
    { id: "C", label: "Do X" },
    { id: "D", label: "Do Y" }
  ],
  edges: [
    { from: "A", to: "B" },
    { from: "B", to: "C", label: "Yes" },
    { from: "B", to: "D", label: "No" }
  ]
})
```

## Common errors
- Node IDs must not contain spaces or special characters
- Use `-->` for arrows, `---` for lines (no arrow)
- Wrap labels with spaces in brackets: `A[My Label]`
