---
widget: mermaid-er
description: Entity-Relationship diagram showing entities, attributes, and relationships with cardinality.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid ER diagram definition"
    entities:
      type: array
      items:
        type: object
        required: [name]
        properties:
          name:
            type: string
          attributes:
            type: array
            items:
              type: object
              required: [type, name]
              properties:
                type:
                  type: string
                name:
                  type: string
    relations:
      type: array
      items:
        type: object
        required: [from, to, fromCardinality, toCardinality, label]
        properties:
          from:
            type: string
          to:
            type: string
          fromCardinality:
            type: string
            description: "e.g. ||, |{, o{, o|"
          toCardinality:
            type: string
            description: "e.g. ||, }|, }o, |o"
          label:
            type: string
---
Renders an Entity-Relationship diagram. Provide either a raw `definition` or structured `entities` and `relations` with cardinality.
