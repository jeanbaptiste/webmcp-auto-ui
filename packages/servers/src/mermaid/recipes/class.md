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

## How
1. Call `mermaid_webmcp_widget_display({name: "class", params: {definition: "classDiagram\n  class Animal {\n    +name: string\n    +speak()\n  }\n  class Dog\n  Animal <|-- Dog"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-class", params: {definition: "classDiagram\n  class Vehicle {\n    +make: string\n    +model: string\n    +start()\n  }\n  class Car {\n    +doors: number\n  }\n  class Truck {\n    +payload: number\n  }\n  Vehicle <|-- Car\n  Vehicle <|-- Truck"}})
```
