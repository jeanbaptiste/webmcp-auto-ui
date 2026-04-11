---
widget: er-diagram
description: Entity-Relationship diagram for database schemas (Mermaid.js)
group: mermaid
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid erDiagram syntax"
    entities:
      type: array
      description: "Structured entities [{name, attributes}] — alternative to definition"
      items:
        type: object
        properties:
          name:
            type: string
          attributes:
            type: array
            items:
              type: object
              properties:
                type:
                  type: string
                name:
                  type: string
                key:
                  type: string
                  description: "PK, FK, or empty"
    relationships:
      type: array
      description: "Structured relationships [{from, to, cardinality, label}]"
      items:
        type: object
        properties:
          from:
            type: string
          to:
            type: string
          cardinality:
            type: string
            description: "one-to-one, one-to-many, many-to-many, zero-to-one, zero-to-many"
          label:
            type: string
---

## When to use
For database schema visualization, data modeling. Shows entities (tables), their attributes, and relationships with cardinality.

## How
**Raw syntax:**
```
widget_display('er-diagram', { definition: "erDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  PRODUCT ||--o{ LINE_ITEM : \"is in\"\n  USER {\n    int id PK\n    string name\n    string email\n  }\n  ORDER {\n    int id PK\n    int user_id FK\n    date created_at\n  }" })
```

**Structured data:**
```
widget_display('er-diagram', {
  entities: [
    { name: "USER", attributes: [
      { type: "int", name: "id", key: "PK" },
      { type: "string", name: "name" },
      { type: "string", name: "email" }
    ]},
    { name: "ORDER", attributes: [
      { type: "int", name: "id", key: "PK" },
      { type: "int", name: "user_id", key: "FK" }
    ]}
  ],
  relationships: [
    { from: "USER", to: "ORDER", cardinality: "one-to-many", label: "places" }
  ]
})
```

## Common errors
- Entity names must not contain spaces (use underscores)
- Cardinality symbols: `||--||` (one-to-one), `||--o{` (one-to-many), `}o--o{` (many-to-many)
- Attribute types are free text (int, string, date, etc.)
