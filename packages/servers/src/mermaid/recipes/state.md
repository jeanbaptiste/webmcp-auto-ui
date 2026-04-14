---
widget: mermaid-state
description: State diagram showing states and transitions between them.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid state diagram definition"
    states:
      type: array
      items:
        type: string
      description: "List of state names"
    transitions:
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
---
Renders a Mermaid state diagram (v2). Provide either a raw `definition` or structured `states` and `transitions`.

## How
1. Call `mermaid_webmcp_widget_display({name: "state", params: {definition: "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running : start\n  Running --> Idle : stop"}})`
