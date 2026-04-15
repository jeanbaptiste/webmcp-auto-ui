---
widget: sankey
description: Sankey diagram (flow between nodes)
group: rich
schema:
  type: object
  required:
    - nodes
    - links
  properties:
    title:
      type: string
    nodes:
      type: array
      items:
        type: object
        required:
          - id
          - label
        properties:
          id:
            type: string
          label:
            type: string
          color:
            type: string
    links:
      type: array
      items:
        type: object
        required:
          - source
          - target
          - value
        properties:
          source:
            type: string
          target:
            type: string
          value:
            type: number
---

## When to use
Visualize flows or transfers between categories — budget, conversions, migrations, data flows. Nodes represent stages and links represent transferred quantities.

## How to use
1. Fetch flow data via MCP
2. Define nodes (stages) and links (flows between stages)
3. Call `autoui_webmcp_widget_display('sankey', { title: 'Budget Flow', nodes: [{ id: 'rev', label: 'Revenue' }, { id: 'sal', label: 'Salaries' }], links: [{ source: 'rev', target: 'sal', value: 50000 }] })`

## Common mistakes
- The `source` and `target` in links must match existing `id` values in the nodes
- Do not create cycles (flow must be directional)
