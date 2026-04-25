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

## How
1. Call `mermaid_webmcp_widget_display({name: "er", params: {definition: "erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE-ITEM : contains"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-er", params: {definition: "erDiagram\n  USER {\n    int id PK\n    string email\n    string name\n  }\n  POST {\n    int id PK\n    string title\n    string body\n    int userId FK\n  }\n  COMMENT {\n    int id PK\n    string text\n    int postId FK\n  }\n  USER ||--o{ POST : writes\n  POST ||--o{ COMMENT : receives"}})
```
