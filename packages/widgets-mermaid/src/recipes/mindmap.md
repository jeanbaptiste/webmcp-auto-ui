---
widget: mindmap
description: Mindmap for brainstorming and idea organization (Mermaid.js)
group: mermaid
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid mindmap syntax (indentation-based)"
    root:
      type: string
      description: "Root topic label — used with structured data"
    children:
      type: array
      description: "Structured tree [{label, children?}] — alternative to definition"
      items:
        type: object
        properties:
          label:
            type: string
          children:
            type: array
            items:
              type: object
              properties:
                label:
                  type: string
                children:
                  type: array
---

## When to use
For brainstorming, topic exploration, knowledge mapping, hierarchical idea organization. Shows a central concept branching out into subtopics.

## How
**Raw syntax:**
```
widget_display('mindmap', { definition: "mindmap\n  root((Project))\n    Development\n      Frontend\n        React\n        Svelte\n      Backend\n        Node.js\n        Python\n    Design\n      UX Research\n      UI Components" })
```

**Structured data:**
```
widget_display('mindmap', {
  root: "Project",
  children: [
    { label: "Development", children: [
      { label: "Frontend", children: [
        { label: "React" }, { label: "Svelte" }
      ]},
      { label: "Backend", children: [
        { label: "Node.js" }, { label: "Python" }
      ]}
    ]},
    { label: "Design", children: [
      { label: "UX Research" }, { label: "UI Components" }
    ]}
  ]
})
```

## Common errors
- Indentation must be consistent (spaces, not tabs)
- Root node uses `root((Label))` syntax for circle shape
- Each level must be indented deeper than its parent
