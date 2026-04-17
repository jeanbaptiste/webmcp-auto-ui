---
widget: fixed-positions
description: Nodes placed at specific x/y coordinates provided in data
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements with position data. Each element is either a node ({data:{id, label}, position:{x, y}}) or an edge ({data:{source, target}}), never both.
      items:
        type: object
        properties:
          data:
            type: object
            anyOf:
              - required: [id]
                not:
                  required: [source]
                properties:
                  id:
                    type: string
                  label:
                    type: string
              - required: [source, target]
                not:
                  required: [id]
                properties:
                  source:
                    type: string
                  target:
                    type: string
          position:
            type: object
            properties:
              x:
                type: number
              y:
                type: number
    layout:
      type: object
      description: Optional layout overrides
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders nodes at exact x/y positions specified in each element's `position` field. Uses the `preset` layout. Ideal for geographic overlays, floor plans, or any visualization requiring precise positioning.

## How

1. Call `cytoscape_webmcp_widget_display({name: "fixed-positions", params: {elements: [{data: {id: "a", label: "Server"}, position: {x: 100, y: 50}}, {data: {id: "b", label: "DB"}, position: {x: 300, y: 50}}, {data: {id: "c", label: "Cache"}, position: {x: 200, y: 200}}, {data: {source: "a", target: "b"}}, {data: {source: "a", target: "c"}}]}})`
