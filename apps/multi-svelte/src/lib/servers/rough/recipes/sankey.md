---
id: rough-sankey
name: Sankey Diagram
description: Flow diagram showing quantities between nodes
data:
  nodes: ["Budget", "Marketing", "Engineering", "Sales", "Ads", "Events", "Backend", "Frontend"]
  links:
    - { source: 0, target: 1, value: 40 }
    - { source: 0, target: 2, value: 50 }
    - { source: 0, target: 3, value: 30 }
    - { source: 1, target: 4, value: 25 }
    - { source: 1, target: 5, value: 15 }
    - { source: 2, target: 6, value: 30 }
    - { source: 2, target: 7, value: 20 }
  title: "Budget Allocation"
---

## Sankey Diagram

Weighted flow between source and target nodes.

### Data format

- `nodes` — array of node names (strings)
- `links` — array of `{source, target, value}` objects (indices into nodes)
- `title` — optional chart title
