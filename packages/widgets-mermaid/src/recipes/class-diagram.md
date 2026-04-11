---
widget: class-diagram
description: UML class diagram for object-oriented modeling (Mermaid.js)
group: mermaid
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid classDiagram syntax"
    classes:
      type: array
      description: "Structured classes [{name, members?, methods?}] — alternative to definition"
      items:
        type: object
        properties:
          name:
            type: string
          members:
            type: array
            items:
              type: string
              description: "+public, -private, #protected member"
          methods:
            type: array
            items:
              type: string
              description: "+public, -private, #protected method()"
    relations:
      type: array
      description: "Structured relations [{from, to, type, label?}]"
      items:
        type: object
        properties:
          from:
            type: string
          to:
            type: string
          type:
            type: string
            description: "inheritance, composition, aggregation, association, dependency"
          label:
            type: string
---

## When to use
For showing class hierarchies, interfaces, associations. Ideal for OOP design, API structure documentation, design patterns.

## How
**Raw syntax:**
```
widget_display('class-diagram', { definition: "classDiagram\n  class Animal {\n    +String name\n    +int age\n    +makeSound() void\n  }\n  class Dog {\n    +fetch() void\n  }\n  class Cat {\n    +purr() void\n  }\n  Animal <|-- Dog\n  Animal <|-- Cat" })
```

**Structured data:**
```
widget_display('class-diagram', {
  classes: [
    { name: "Animal", members: ["+String name", "+int age"], methods: ["+makeSound() void"] },
    { name: "Dog", methods: ["+fetch() void"] },
    { name: "Cat", methods: ["+purr() void"] }
  ],
  relations: [
    { from: "Animal", to: "Dog", type: "inheritance" },
    { from: "Animal", to: "Cat", type: "inheritance" }
  ]
})
```

## Common errors
- Visibility prefixes: `+` public, `-` private, `#` protected, `~` package
- Relation arrows: `<|--` inheritance, `*--` composition, `o--` aggregation, `-->` association
- Class names must not contain spaces
