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

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-sankey", params: {definition: "sankey-beta\n  Traffic,Organic Search,45\n  Traffic,Direct,30\n  Traffic,Social Media,25\n  Organic Search,Conversions,20\n  Direct,Conversions,18\n  Social Media,Conversions,10\n  Organic Search,Bounce,25\n  Direct,Bounce,12\n  Social Media,Bounce,15"}})
```
