---
widget: mermaid-architecture
description: Architecture diagram showing services, groups, and their connections.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid architecture diagram definition"
    groups:
      type: array
      items:
        type: object
        required: [id, label]
        properties:
          id:
            type: string
          label:
            type: string
          icon:
            type: string
    services:
      type: array
      items:
        type: object
        required: [id, label]
        properties:
          id:
            type: string
          label:
            type: string
          icon:
            type: string
            description: "Icon name (e.g. server, database, disk)"
          inGroup:
            type: string
            description: "Group ID this service belongs to"
    edges:
      type: array
      items:
        type: object
        required: [from, to, direction]
        properties:
          from:
            type: string
          to:
            type: string
          direction:
            type: string
            enum: [L, R, T, B]
            description: "Connection direction"
---
Renders an architecture diagram. Provide either a raw `definition` or structured `groups`, `services`, and `edges`.
