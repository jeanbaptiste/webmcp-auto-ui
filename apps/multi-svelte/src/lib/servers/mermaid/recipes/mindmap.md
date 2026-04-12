---
widget: mermaid-mindmap
description: Mind map with a hierarchical tree of nodes branching from a central root.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid mindmap definition"
    root:
      type: object
      required: [label]
      description: "Root node with recursive children"
      properties:
        label:
          type: string
        shape:
          type: string
          enum: [default, circle, bang, cloud, hexagon]
        children:
          type: array
          items:
            type: object
            properties:
              label:
                type: string
              shape:
                type: string
              children:
                type: array
                items:
                  type: object
---
Renders a mind map. Provide either a raw `definition` or a `root` node with nested `children` arrays.

## How
1. Call `mermaid_webmcp_widget_display({name: "mindmap", params: {definition: "mindmap\n  root((Project))\n    Frontend\n      React\n      Svelte\n    Backend\n      Node\n      Python"}})`
