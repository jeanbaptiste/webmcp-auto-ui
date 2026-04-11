---
widget: chord
description: Chord diagram (flows between groups in a circular layout)
group: d3
schema:
  type: object
  required:
    - labels
    - matrix
  properties:
    title:
      type: string
    labels:
      type: array
      items:
        type: string
      description: "Group names (one per row/column in the matrix)"
    matrix:
      type: array
      items:
        type: array
        items:
          type: number
      description: "Square matrix of flow values between groups"
    colorScheme:
      type: string
      description: "D3 color scheme name (default: Tableau10)"
---

## When to use
For showing flows or relationships between groups in a circular layout (trade between countries, migration, inter-department collaboration).

## How
1. Get flow data from MCP
2. Build a square matrix where matrix[i][j] = flow from group i to group j
3. Call `d3_webmcp_widget_display('chord', {labels: ['A','B','C'], matrix: [[0,5,2],[3,0,4],[1,2,0]]})`

## Common errors
- The matrix must be square (N x N where N = labels.length)
- Diagonal values (self-flows) can be 0 or positive
- All values must be non-negative
