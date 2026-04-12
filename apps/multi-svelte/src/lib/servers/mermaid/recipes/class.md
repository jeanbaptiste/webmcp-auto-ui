---
widget: mermaid-class
description: UML class diagram showing classes, their members, methods, and relationships.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid class diagram definition"
    classes:
      type: array
      items:
        type: object
        required: [name]
        properties:
          name:
            type: string
          members:
            type: array
            items:
              type: string
          methods:
            type: array
            items:
              type: string
    relations:
      type: array
      items:
        type: object
        required: [from, to]
        properties:
          from:
            type: string
          to:
            type: string
          type:
            type: string
            enum: [inheritance, composition, aggregation, association]
          label:
            type: string
---
Renders a UML class diagram. Provide either a raw `definition` or structured `classes` and `relations`.
