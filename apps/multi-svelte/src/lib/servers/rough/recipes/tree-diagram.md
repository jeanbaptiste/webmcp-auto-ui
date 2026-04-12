---
id: rough-tree-diagram
name: Tree Diagram
description: Hierarchical tree with parent-child node connections
data:
  root:
    label: "CEO"
    children:
      - label: "CTO"
        children:
          - { label: "Dev Lead" }
          - { label: "QA Lead" }
      - label: "CFO"
        children:
          - { label: "Accounting" }
      - label: "CMO"
  title: "Org Chart"
---

## Tree Diagram

Hierarchical tree structure with nodes and connecting lines.

### Data format

- `root` — recursive `{label, children?}` object
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "tree-diagram", params: {root: {label: "CEO", children: [{label: "CTO"}, {label: "CFO"}]}, title: "Org Chart"}})`
