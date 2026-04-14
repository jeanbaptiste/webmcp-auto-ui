---
widget: mermaid-sankey
description: Sankey diagram showing flow quantities between nodes.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid sankey definition"
    links:
      type: array
      items:
        type: object
        required: [source, target, value]
        properties:
          source:
            type: string
          target:
            type: string
          value:
            type: number
---
Renders a Sankey diagram. Provide either a raw `definition` or structured `links` with source, target, and flow value.

## How
1. Call `mermaid_webmcp_widget_display({name: "sankey", params: {definition: "sankey-beta\n  Source,Target,50\n  Source,Other,30\n  Target,End,40"}})`
