---
id: rough-chord-diagram
name: Chord Diagram
description: Circular diagram showing flows between groups
data:
  labels: ["A", "B", "C", "D"]
  matrix:
    - [0, 10, 5, 3]
    - [10, 0, 8, 2]
    - [5, 8, 0, 6]
    - [3, 2, 6, 0]
  title: "Inter-department Flow"
---

## Chord Diagram

Circular layout with arcs and chords showing mutual flows.

### Data format

- `labels` — group names
- `matrix` — NxN adjacency matrix of flow values
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "chord-diagram", params: {labels: ["A","B","C"], matrix: [[0,10,5],[10,0,8],[5,8,0]], title: "Inter-department Flow"}})`
