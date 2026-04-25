---
widget: rough-venn-diagram
description: Overlapping circles showing set relationships
schema:
  type: object
  required:
    - sets
  properties:
    sets:
      type: array
      items:
        type: object
        required:
          - label
          - size
        properties:
          label:
            type: string
            description: Set name
          size:
            type: number
            description: Relative size of the set
      description: Sets to display as overlapping circles
    title:
      type: string
      description: Chart title
---

## Venn Diagram

Overlapping circles representing set sizes and intersections.

### Data format

- `sets` — array of `{label, size}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "venn-diagram", params: {sets: [{label: "JavaScript", size: 100}, {label: "TypeScript", size: 60}, {label: "Python", size: 80}], title: "Language Skills"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-venn-diagram", params: {sets: [{label: "JavaScript", size: 100}, {label: "TypeScript", size: 60}, {label: "Python", size: 80}], title: "Language Skills"}})
```
