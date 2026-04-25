---
widget: rough-chord-diagram
description: Circular diagram showing flows between groups
schema:
  type: object
  required:
    - labels
    - matrix
  properties:
    labels:
      type: array
      items:
        type: string
      description: Group names
    matrix:
      type: array
      items:
        type: array
        items:
          type: number
      description: NxN adjacency matrix of flow values
    title:
      type: string
      description: Chart title
---

## Chord Diagram

Circular layout with arcs and chords showing mutual flows.

### Data format

- `labels` — group names
- `matrix` — NxN adjacency matrix of flow values
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "chord-diagram", params: {labels: ["A","B","C"], matrix: [[0,10,5],[10,0,8],[5,8,0]], title: "Inter-department Flow"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-chord-diagram", params: {labels: ["Sales","Engineering","Marketing"], matrix: [[0,15,8],[15,0,12],[8,12,0]], title: "Cross-team Collaboration"}})
```
