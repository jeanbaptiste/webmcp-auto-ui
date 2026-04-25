---
widget: mermaid-flowchart
description: Flowchart diagram with nodes and directional edges. Supports various node shapes and edge styles.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid flowchart definition string (bypasses structured data)"
    direction:
      type: string
      enum: [TD, TB, BT, RL, LR]
      description: "Flow direction: TD (top-down), LR (left-right), etc."
    nodes:
      type: array
      items:
        type: object
        required: [id]
        properties:
          id:
            type: string
          label:
            type: string
          shape:
            type: string
            enum: [rect, round, stadium, diamond, circle, hexagon]
    edges:
      type: array
      items:
        type: object
        required: [from, to]
        properties:
          from:
            type: string
          to:
            type: string
          label:
            type: string
          style:
            type: string
            enum: [solid, dotted, thick]
---
Renders a Mermaid flowchart. Provide either a raw `definition` string or structured `nodes` and `edges` arrays.
Supports node shapes (rect, round, stadium, diamond, circle, hexagon) and edge styles (solid, dotted, thick).

## How
1. Call `mermaid_webmcp_widget_display({name: "flowchart", params: {definition: "flowchart TD\n  A[Start] --> B[End]"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-flowchart", params: {definition: "flowchart LR\n  A([User]) --> B{Authenticated?}\n  B -- Yes --> C[Dashboard]\n  B -- No --> D[Login Page]\n  D --> E[Submit Credentials]\n  E --> B"}})
```
